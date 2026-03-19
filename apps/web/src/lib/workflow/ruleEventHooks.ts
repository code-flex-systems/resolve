import type { ProtectedContext } from '@/server/trpc/trpc';
import { WorkflowTriggerType } from '@/config/enums';
import { evaluateRules } from './ruleExecutionEngine';

/**
 * Workflow Rule Event Hooks
 *
 * These hooks are called after mutations complete to check if any workflow rules
 * should fire. They run outside the parent transaction as fire-and-forget operations:
 * - Failures are logged but don't roll back the original user action
 * - They use the base ctx (not a transaction ctx) so the orchestrator manages its own transactions
 */

/** Claim fields that have corresponding workflow condition fields */
const WORKFLOW_RELEVANT_CLAIM_FIELDS = new Set([
	'recovery_status',
	'substatus',
	'line_of_business',
	'claim_amount',
	'expected_recovery',
	'actual_recovery',
	'desk_location_id',
]);

/**
 * Call after a claim field update to check FIELD_CHANGE rules.
 * Only triggers evaluation if a workflow-relevant field was changed.
 *
 * @param ctx - Protected context (outside transaction — orchestrator manages its own)
 * @param claimId - The claim that was updated
 * @param changedFields - Field names that were updated
 */
export async function onClaimFieldChange(
	ctx: ProtectedContext,
	claimId: number,
	changedFields: string[]
): Promise<void> {
	try {
		// Only evaluate if a workflow-relevant field changed
		const hasRelevantChange = changedFields.some((f) => WORKFLOW_RELEVANT_CLAIM_FIELDS.has(f));
		if (!hasRelevantChange) return;

		await evaluateRules(ctx, {
			triggerType: WorkflowTriggerType.FIELD_CHANGE,
			claimIds: [claimId],
		});
	} catch (err) {
		console.error(`[ruleEventHooks] onClaimFieldChange failed for claim ${claimId}:`, err);
	}
}

/**
 * Call after a task is completed to check TASK_COMPLETED rules.
 *
 * @param ctx - Protected context (outside transaction — orchestrator manages its own)
 * @param taskId - The task that was completed
 * @param claimId - The claim the task belongs to
 */
export async function onTaskCompleted(
	ctx: ProtectedContext,
	taskId: number,
	claimId: number
): Promise<void> {
	try {
		await evaluateRules(ctx, {
			triggerType: WorkflowTriggerType.TASK_COMPLETED,
			claimIds: [claimId],
		});
	} catch (err) {
		console.error(`[ruleEventHooks] onTaskCompleted failed for task ${taskId}, claim ${claimId}:`, err);
	}
}
