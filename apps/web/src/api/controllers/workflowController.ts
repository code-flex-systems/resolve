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
} from '@/config/enums';
import type { RuleConditionsInput } from '@/schemas/workflowSchemas';
import { validateRuleConditions, type RuleConditions } from '@/lib/workflow/ruleConditions';

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
