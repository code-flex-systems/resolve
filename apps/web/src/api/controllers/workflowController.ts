import type { ProtectedContext } from '@/server/trpc/trpc';
import * as workflowQueries from '@/api/queries/workflowQueries';
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
import { TRPCError } from '@trpc/server';
import {
	WorkflowTriggerType,
	WorkflowActionType,
	WorkflowExecutionMode,
	WorkflowThresholdType,
	RuleExecutionStatus,
} from '@/config/enums';
import type { RuleConditionsInput } from '@/schemas/workflowSchemas';
import { validateRuleConditions, type RuleConditions } from '@/lib/workflow/ruleConditions';
import { evaluateRules } from '@/lib/workflow/ruleExecutionEngine';
import { evaluateConditions } from '@/lib/workflow/conditionEvaluator';
import { executeAction } from '@/lib/workflow/actionExecutors';

// ============================================================================
// WORKFLOW DEFINITION CONTROLLERS
// ============================================================================

export async function getWorkflowDefinitions(
	ctx: ProtectedContext,
	{
		isActive,
	}: {
		isActive?: boolean;
	}
) {
	return await workflowQueries.getWorkflowDefinitions(ctx, isActive);
}

export async function getWorkflowDefinition(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await workflowQueries.getWorkflowDefinition(ctx, id);
}

export async function createWorkflowDefinition(
	ctx: ProtectedContext,
	input: {
		name: string;
		description?: string;
		deskLocationId?: number;
	}
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const definition = await workflowQueries.createWorkflowDefinition(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: definition.id,
				entityName: EntityName.WORKFLOW_DEFINITION,
				action: AdminAction.CREATE,
				value: {
					name: definition.name,
					deskLocationId: input.deskLocationId,
				},
			}
		);

		return definition;
	});
}

export async function updateWorkflowDefinition(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			name?: string;
			description?: string;
			deskLocationId?: number | null;
			isActive?: boolean;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const definition = await workflowQueries.updateWorkflowDefinition(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_DEFINITION,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return definition;
	});
}

export async function archiveWorkflowDefinition(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		// Cascade soft-delete children first, collecting IDs for logging
		const [archivedThresholdIds, archivedRuleIds] = await Promise.all([
			workflowQueries.archiveWorkflowThresholdsByDefinition(trxCtx, id),
			workflowQueries.archiveWorkflowRulesByDefinition(trxCtx, id),
		]);

		const definition = await workflowQueries.archiveWorkflowDefinition(trxCtx, id);

		// Build admin log entries for parent and all children
		const logEntries = [
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_DEFINITION,
				action: AdminAction.DELETE,
				value: { name: definition.name },
			},
			...archivedThresholdIds.map((thresholdId) => ({
				entityId: thresholdId,
				entityName: EntityName.WORKFLOW_THRESHOLD,
				action: AdminAction.DELETE,
				value: { cascadeDeleteFrom: 'workflow_definition', parentId: id },
			})),
			...archivedRuleIds.map((ruleId) => ({
				entityId: ruleId,
				entityName: EntityName.WORKFLOW_RULE,
				action: AdminAction.DELETE,
				value: { cascadeDeleteFrom: 'workflow_definition', parentId: id },
			})),
		];

		await logAdminActions(trxCtx, logEntries);

		return definition;
	});
}

// ============================================================================
// WORKFLOW THRESHOLD CONTROLLERS
// ============================================================================

export async function getWorkflowThresholds(
	ctx: ProtectedContext,
	{ workflowDefinitionId }: { workflowDefinitionId: number }
) {
	return await workflowQueries.getWorkflowThresholds(ctx, workflowDefinitionId);
}

export async function createWorkflowThreshold(
	ctx: ProtectedContext,
	input: {
		workflowDefinitionId: number;
		thresholdType: WorkflowThresholdType;
		thresholdValue: number;
	}
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const threshold = await workflowQueries.createWorkflowThreshold(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: threshold.id,
				entityName: EntityName.WORKFLOW_THRESHOLD,
				action: AdminAction.CREATE,
				value: {
					workflowDefinitionId: input.workflowDefinitionId,
					thresholdType: input.thresholdType,
					thresholdValue: input.thresholdValue,
				},
			}
		);

		return threshold;
	});
}

export async function updateWorkflowThreshold(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			thresholdValue?: number;
			isActive?: boolean;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const threshold = await workflowQueries.updateWorkflowThreshold(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_THRESHOLD,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return threshold;
	});
}

export async function archiveWorkflowThreshold(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const result = await workflowQueries.archiveWorkflowThreshold(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_THRESHOLD,
				action: AdminAction.DELETE,
				value: {},
			}
		);

		return result;
	});
}

// ============================================================================
// WORKFLOW RULE CONTROLLERS
// ============================================================================

export async function getWorkflowRules(
	ctx: ProtectedContext,
	{ workflowDefinitionId }: { workflowDefinitionId: number }
) {
	return await workflowQueries.getWorkflowRules(ctx, workflowDefinitionId);
}

export async function createWorkflowRule(
	ctx: ProtectedContext,
	input: {
		workflowDefinitionId: number;
		name: string;
		description?: string;
		triggerType: WorkflowTriggerType;
		actionType: WorkflowActionType;
		actionConfig?: Record<string, unknown>;
		conditions?: RuleConditionsInput;
		executionMode: WorkflowExecutionMode;
		priority?: number;
	}
) {
	// Validate conditions if provided
	if (input.conditions) {
		const validationResult = await validateRuleConditions(ctx, input.conditions as RuleConditions);
		if (!validationResult.valid) {
			const errorMessages = validationResult.errors.map((e) => e.message).join('; ');
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Invalid rule conditions: ${errorMessages}`,
			});
		}
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const rule = await workflowQueries.createWorkflowRule(
			{ ...ctx, db: trx },
			input
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: rule.id,
				entityName: EntityName.WORKFLOW_RULE,
				action: AdminAction.CREATE,
				value: {
					name: rule.name,
					workflowDefinitionId: input.workflowDefinitionId,
					triggerType: input.triggerType,
					actionType: input.actionType,
				},
			}
		);

		return rule;
	});
}

export async function updateWorkflowRule(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			name?: string;
			description?: string;
			triggerType?: WorkflowTriggerType;
			actionType?: WorkflowActionType;
			actionConfig?: Record<string, unknown>;
			conditions?: RuleConditionsInput;
			executionMode?: WorkflowExecutionMode;
			priority?: number;
			isActive?: boolean;
		};
	}
) {
	if (Object.keys(params).length === 0) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'No updates provided',
		});
	}

	// Validate conditions if provided
	if (params.conditions) {
		const validationResult = await validateRuleConditions(ctx, params.conditions as RuleConditions);
		if (!validationResult.valid) {
			const errorMessages = validationResult.errors.map((e) => e.message).join('; ');
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Invalid rule conditions: ${errorMessages}`,
			});
		}
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const rule = await workflowQueries.updateWorkflowRule(
			{ ...ctx, db: trx },
			id,
			params
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_RULE,
				action: AdminAction.UPDATE,
				value: params,
			}
		);

		return rule;
	});
}

export async function archiveWorkflowRule(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const result = await workflowQueries.archiveWorkflowRule(
			{ ...ctx, db: trx },
			id
		);

		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: id,
				entityName: EntityName.WORKFLOW_RULE,
				action: AdminAction.DELETE,
				value: {},
			}
		);

		return result;
	});
}

// ============================================================================
// WORKFLOW RESOLUTION CONTROLLERS
// ============================================================================

export async function resolveWorkflowForLocation(
	ctx: ProtectedContext,
	{ deskLocationId }: { deskLocationId: number }
) {
	return await workflowQueries.resolveWorkflowForLocation(ctx, deskLocationId);
}

// ============================================================================
// RULE EXECUTION CONTROLLERS
// ============================================================================

/**
 * Manually execute a single rule.
 * Admin clicks "Run" from the rule management UI.
 * Uses MANUAL trigger type regardless of the rule's configured trigger.
 */
export async function executeRule(
	ctx: ProtectedContext,
	{ ruleId, deskLocationId }: { ruleId: number; deskLocationId?: number }
) {
	const summary = await evaluateRules(ctx, {
		triggerType: WorkflowTriggerType.MANUAL,
		ruleId,
		deskLocationId,
	});

	await logAdminAction(ctx, {
		entityId: ruleId,
		entityName: EntityName.WORKFLOW_RULE_EXECUTION,
		action: AdminAction.CREATE,
		value: {
			triggerType: WorkflowTriggerType.MANUAL,
			ruleId,
			deskLocationId,
			summary,
		},
	});

	return summary;
}

/**
 * Evaluate all applicable rules for a given trigger type.
 * Used by poll-based triggers or admin "evaluate all" button.
 */
export async function evaluateRulesByTrigger(
	ctx: ProtectedContext,
	{
		triggerType,
		deskLocationId,
	}: {
		triggerType: WorkflowTriggerType;
		deskLocationId?: number;
	}
) {
	const summary = await evaluateRules(ctx, {
		triggerType,
		deskLocationId,
	});

	await logAdminAction(ctx, {
		entityId: 0,
		entityName: EntityName.WORKFLOW_RULE_EXECUTION,
		action: AdminAction.CREATE,
		value: {
			triggerType,
			deskLocationId,
			summary,
		},
	});

	return summary;
}

/**
 * Approve and execute a pending rule execution.
 * Re-validates that the claim still matches the rule's conditions before executing.
 */
export async function approvePendingExecution(
	ctx: ProtectedContext,
	{ executionId }: { executionId: number }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		// All reads inside the transaction to prevent TOCTOU race conditions
		const execution = await workflowQueries.getRuleExecution(trxCtx, executionId);

		if (!execution) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Rule execution not found',
			});
		}

		if (execution.status !== RuleExecutionStatus.PENDING) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Execution is already ${execution.status}`,
			});
		}

		// Fetch the rule to get current conditions for re-validation
		const rule = await trx
			.selectFrom('workflow_rule')
			.select(['id', 'name', 'conditions', 'action_type', 'action_config', 'is_active', 'deleted_at'])
			.where('id', '=', execution.workflow_rule_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.executeTakeFirst();

		if (!rule || !rule.is_active || rule.deleted_at) {
			await workflowQueries.updateRuleExecution(trxCtx, executionId, {
				status: RuleExecutionStatus.SKIPPED,
				errorMessage: 'Rule is no longer active',
			});
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: 'Rule is no longer active',
			});
		}

		// Re-validate: check that the claim still matches conditions
		const conditions = rule.conditions as unknown as RuleConditions;
		if (conditions?.conditions?.length) {
			const matches = await evaluateConditions(trxCtx, conditions, {
				claimIds: [execution.claim_id],
			});

			if (matches.length === 0) {
				await workflowQueries.updateRuleExecution(trxCtx, executionId, {
					status: RuleExecutionStatus.SKIPPED,
					errorMessage: 'Claim no longer matches rule conditions',
				});
				throw new TRPCError({
					code: 'BAD_REQUEST',
					message: 'Claim no longer matches rule conditions',
				});
			}
		}

		const actionType = execution.action_type as WorkflowActionType;
		const actionConfig = execution.action_config as Record<string, unknown>;

		// Get claim's current desk location and claim number in one query
		const claim = await trx
			.selectFrom('claim')
			.select(['id', 'desk_location_id', 'claim_number'])
			.where('id', '=', execution.claim_id)
			.where('client_id', '=', ctx.session.user.client_id)
			.executeTakeFirstOrThrow();

		const result = await executeAction(actionType, {
			ctx: trxCtx,
			claimId: execution.claim_id,
			currentDeskLocationId: claim.desk_location_id,
			claimNumber: claim.claim_number,
			actionConfig,
			ruleId: execution.workflow_rule_id,
			ruleName: rule.name,
		});

		if (result.success) {
			await workflowQueries.updateRuleExecution(trxCtx, executionId, {
				status: RuleExecutionStatus.EXECUTED,
				resultData: result.data,
			});
		} else {
			await workflowQueries.updateRuleExecution(trxCtx, executionId, {
				status: RuleExecutionStatus.FAILED,
				errorMessage: result.error,
			});
		}

		await logAdminAction(trxCtx, {
			entityId: executionId,
			entityName: EntityName.WORKFLOW_RULE_EXECUTION,
			action: AdminAction.UPDATE,
			value: {
				ruleId: execution.workflow_rule_id,
				claimId: execution.claim_id,
				actionType,
				result: result.success ? 'executed' : 'failed',
			},
		});

		return result;
	});
}

/**
 * Reject a pending rule execution.
 * Transitions execution from PENDING to SKIPPED.
 */
export async function rejectPendingExecution(
	ctx: ProtectedContext,
	{ executionId }: { executionId: number }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };

		const execution = await workflowQueries.getRuleExecution(trxCtx, executionId);

		if (!execution) {
			throw new TRPCError({
				code: 'NOT_FOUND',
				message: 'Rule execution not found',
			});
		}

		if (execution.status !== RuleExecutionStatus.PENDING) {
			throw new TRPCError({
				code: 'BAD_REQUEST',
				message: `Execution is already ${execution.status}`,
			});
		}

		const updated = await workflowQueries.updateRuleExecution(trxCtx, executionId, {
			status: RuleExecutionStatus.SKIPPED,
		});

		await logAdminAction(trxCtx, {
			entityId: executionId,
			entityName: EntityName.WORKFLOW_RULE_EXECUTION,
			action: AdminAction.UPDATE,
			value: {
				ruleId: execution.workflow_rule_id,
				claimId: execution.claim_id,
				result: 'rejected',
			},
		});

		return updated;
	});
}

/**
 * List pending rule executions for admin review.
 */
export async function getPendingExecutions(
	ctx: ProtectedContext,
	{ ruleId, limit, offset }: { ruleId?: number; limit: number; offset: number }
) {
	return await workflowQueries.getPendingRuleExecutions(ctx, {
		ruleId,
		limit,
		offset,
	});
}

/**
 * Get execution history for a rule or claim.
 */
export async function getRuleExecutionHistory(
	ctx: ProtectedContext,
	input: {
		ruleId?: number;
		claimId?: number;
		status?: RuleExecutionStatus;
		limit: number;
		cursor?: { createdAt: string; id: number };
	}
) {
	return await workflowQueries.getRuleExecutions(ctx, input);
}
