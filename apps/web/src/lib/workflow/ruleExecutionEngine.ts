import type { ProtectedContext } from '@/server/trpc/trpc';
import {
	WorkflowTriggerType,
	WorkflowActionType,
	WorkflowExecutionMode,
	RuleExecutionStatus,
} from '@/config/enums';
import * as workflowQueries from '@/api/queries/workflowQueries';
import { evaluateConditions, type ConditionScopeFilter } from './conditionEvaluator';
import { executeAction, type ActionExecutorResult } from './actionExecutors';
import type { RuleConditions } from './ruleConditions';

// =============================================================================
// TYPES
// =============================================================================

export interface RuleExecutionInput {
	/** The trigger that initiated evaluation */
	triggerType: WorkflowTriggerType;
	/** Optional: narrow scope to specific desk location */
	deskLocationId?: string;
	/** Optional: narrow scope to specific claims (for event-driven triggers) */
	claimIds?: string[];
	/** Optional: run only a specific rule (for manual execution) */
	ruleId?: string;
}

export interface RuleExecutionSummary {
	rulesEvaluated: number;
	claimsMatched: number;
	actionsExecuted: number;
	actionsSuggested: number;
	errors: Array<{ ruleId: string; ruleName: string; claimId?: string; error: string }>;
}

// =============================================================================
// MAIN ORCHESTRATOR
// =============================================================================

/**
 * Main entry point for rule evaluation.
 *
 * 1. Finds applicable rules (active, matching trigger_type, matching workflow scope)
 * 2. For each rule (ordered by priority), evaluates conditions against claims
 * 3. For each matching claim:
 *    - AUTO mode: executes action in a transaction, logs execution with status=executed
 *    - SUGGEST mode: creates pending execution record for admin approval
 * 4. Returns summary of all actions taken
 *
 * @param ctx - Protected context (not necessarily in a transaction — we open one per action)
 * @param input - Trigger context and optional scope filters
 */
export async function evaluateRules(
	ctx: ProtectedContext,
	input: RuleExecutionInput
): Promise<RuleExecutionSummary> {
	const summary: RuleExecutionSummary = {
		rulesEvaluated: 0,
		claimsMatched: 0,
		actionsExecuted: 0,
		actionsSuggested: 0,
		errors: [],
	};

	// Find applicable rules
	const rules = await workflowQueries.getApplicableRules(ctx, {
		triggerType: input.triggerType,
		deskLocationId: input.deskLocationId,
		ruleId: input.ruleId,
	});

	summary.rulesEvaluated = rules.length;

	if (rules.length === 0) {
		return summary;
	}

	// Build scope filter for condition evaluation
	const scopeFilter: ConditionScopeFilter = {};
	if (input.deskLocationId != null) {
		scopeFilter.deskLocationId = input.deskLocationId;
	}
	if (input.claimIds && input.claimIds.length > 0) {
		scopeFilter.claimIds = input.claimIds;
	}

	// Evaluate each rule
	for (const rule of rules) {
		try {
			const conditions = rule.conditions as unknown as RuleConditions;

			// Skip rules with no conditions
			if (!conditions?.conditions?.length) {
				continue;
			}

			// Find matching claims
			const matches = await evaluateConditions(ctx, conditions, scopeFilter);

			summary.claimsMatched += matches.length;

			if (matches.length === 0) {
				continue;
			}

			const actionType = rule.action_type as WorkflowActionType;
			const actionConfig = rule.action_config as Record<string, unknown>;
			const executionMode = rule.execution_mode as WorkflowExecutionMode;

			// Process each matching claim
			for (const match of matches) {
				try {
					if (executionMode === WorkflowExecutionMode.AUTO) {
						await executeAutoAction(ctx, {
							rule,
							actionType,
							actionConfig,
							claimId: match.claimId,
							currentDeskLocationId: match.deskLocationId,
							triggerType: input.triggerType,
						});
						summary.actionsExecuted++;
					} else {
						// SUGGEST mode — create pending execution record
						await workflowQueries.createRuleExecution(ctx, {
							workflowRuleId: rule.id,
							claimId: match.claimId,
							triggerType: rule.trigger_type,
							actionType: rule.action_type,
							actionConfig,
							executionMode: rule.execution_mode,
							status: RuleExecutionStatus.PENDING,
						});
						summary.actionsSuggested++;
					}
				} catch (err) {
					const errorMsg = err instanceof Error ? err.message : String(err);
					summary.errors.push({
						ruleId: rule.id,
						ruleName: rule.name,
						claimId: match.claimId,
						error: errorMsg,
					});
				}
			}
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : String(err);
			summary.errors.push({
				ruleId: rule.id,
				ruleName: rule.name,
				error: `Condition evaluation failed: ${errorMsg}`,
			});
		}
	}

	return summary;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

interface AutoActionInput {
	rule: { id: string; name: string; trigger_type: string; action_type: string; execution_mode: string };
	actionType: WorkflowActionType;
	actionConfig: Record<string, unknown>;
	claimId: string;
	currentDeskLocationId: string | null;
	triggerType: WorkflowTriggerType;
}

/**
 * Execute an action in AUTO mode within a transaction.
 * Creates the execution log entry and runs the action atomically.
 */
async function executeAutoAction(ctx: ProtectedContext, input: AutoActionInput): Promise<void> {
	await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		let result: ActionExecutorResult;
		try {
			result = await executeAction(input.actionType, {
				ctx: trxCtx,
				claimId: input.claimId,
				currentDeskLocationId: input.currentDeskLocationId,
				actionConfig: input.actionConfig,
				ruleId: input.rule.id,
				ruleName: input.rule.name,
			});
		} catch (err) {
			// Convert exception to a failed result so the log persists with the transaction
			const errorMsg = err instanceof Error ? err.message : String(err);
			result = { success: false, error: errorMsg };
		}

		if (result.success) {
			await workflowQueries.createRuleExecution(trxCtx, {
				workflowRuleId: input.rule.id,
				claimId: input.claimId,
				triggerType: input.rule.trigger_type,
				actionType: input.rule.action_type,
				actionConfig: input.actionConfig,
				executionMode: input.rule.execution_mode,
				status: RuleExecutionStatus.EXECUTED,
				resultData: result.data,
			});
		} else {
			await workflowQueries.createRuleExecution(trxCtx, {
				workflowRuleId: input.rule.id,
				claimId: input.claimId,
				triggerType: input.rule.trigger_type,
				actionType: input.rule.action_type,
				actionConfig: input.actionConfig,
				executionMode: input.rule.execution_mode,
				status: RuleExecutionStatus.FAILED,
				errorMessage: result.error,
			});
		}
	});
}
