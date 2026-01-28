import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { TRPCError } from '@trpc/server';
import {
	WorkflowTriggerType,
	WorkflowActionType,
	WorkflowExecutionMode,
	WorkflowThresholdType,
} from '@/config/enums';

// ============================================================================
// TENANT VALIDATION HELPERS
// ============================================================================

/**
 * Validates that a desk location belongs to the caller's tenant.
 * Throws FORBIDDEN if the desk location doesn't exist or belongs to another tenant.
 */
export async function validateDeskLocationBelongsToClient(
	ctx: ProtectedContext,
	deskLocationId: number
): Promise<void> {
	const deskLocation = await ctx.db
		.selectFrom('desk_location')
		.select(['id'])
		.where('id', '=', deskLocationId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();

	if (!deskLocation) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Desk location not found or does not belong to your organization',
		});
	}
}

/**
 * Validates that a workflow definition belongs to the caller's tenant.
 * Throws FORBIDDEN if the workflow doesn't exist or belongs to another tenant.
 */
export async function validateWorkflowDefinitionBelongsToClient(
	ctx: ProtectedContext,
	workflowDefinitionId: number
): Promise<void> {
	const workflow = await ctx.db
		.selectFrom('workflow_definition')
		.select(['id'])
		.where('id', '=', workflowDefinitionId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.executeTakeFirst();

	if (!workflow) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Workflow definition not found or does not belong to your organization',
		});
	}
}

// ============================================================================
// WORKFLOW DEFINITION QUERIES
// ============================================================================

/**
 * Get paginated list of workflow definitions with optional search.
 * Left joins desk_location to include location name for scoped workflows.
 */
export async function getWorkflowDefinitions(
	ctx: ProtectedContext,
	searchTerm?: string,
	limit?: number,
	offset?: number
) {
	let query = ctx.db
		.selectFrom('workflow_definition')
		.leftJoin('desk_location', 'desk_location.id', 'workflow_definition.desk_location_id')
		.select([
			'workflow_definition.id',
			'workflow_definition.name',
			'workflow_definition.description',
			'workflow_definition.desk_location_id',
			'workflow_definition.is_active',
			'workflow_definition.client_id',
			'workflow_definition.created_at',
			'workflow_definition.created_by',
			'workflow_definition.updated_at',
			'workflow_definition.updated_by',
		])
		.select('desk_location.name as desk_location_name')
		.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
		.where('workflow_definition.deleted_at', 'is', null)
		.orderBy('workflow_definition.name asc');

	if (searchTerm) {
		query = query.where(sql<boolean>`workflow_definition.name ILIKE ${`${searchTerm}%`}`);
	}

	const rowsWithCount = await query
		.select(sql<string>`COUNT(*) OVER()`.as('total_count'))
		.$if(limit !== undefined, (qb) => qb.limit(limit!))
		.$if(offset !== undefined, (qb) => qb.offset(offset!))
		.execute();

	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;
	const rows = rowsWithCount.map(({ total_count, ...row }) => row);

	return { rows, count };
}

/**
 * Get single workflow definition by ID.
 * Loads thresholds and rules in parallel for the detail view.
 */
export async function getWorkflowDefinition(ctx: ProtectedContext, id: number) {
	const [definition, thresholds, rules] = await Promise.all([
		ctx.db
			.selectFrom('workflow_definition')
			.leftJoin('desk_location', 'desk_location.id', 'workflow_definition.desk_location_id')
			.select([
				'workflow_definition.id',
				'workflow_definition.name',
				'workflow_definition.description',
				'workflow_definition.desk_location_id',
				'workflow_definition.is_active',
				'workflow_definition.client_id',
				'workflow_definition.created_at',
				'workflow_definition.created_by',
				'workflow_definition.updated_at',
				'workflow_definition.updated_by',
			])
			.select('desk_location.name as desk_location_name')
			.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
			.where('workflow_definition.id', '=', id)
			.where('workflow_definition.deleted_at', 'is', null)
			.executeTakeFirstOrThrow(),
		getWorkflowThresholds(ctx, id),
		getWorkflowRules(ctx, id),
	]);

	return { ...definition, thresholds, rules };
}

/**
 * Create a new workflow definition.
 * Validates that deskLocationId (if provided) belongs to the caller's tenant.
 */
export async function createWorkflowDefinition(
	ctx: ProtectedContext,
	params: {
		name: string;
		description?: string;
		deskLocationId?: number;
	}
) {
	// Validate desk location belongs to caller's tenant before inserting
	if (params.deskLocationId !== undefined) {
		await validateDeskLocationBelongsToClient(ctx, params.deskLocationId);
	}

	return await ctx.db
		.insertInto('workflow_definition')
		.values({
			client_id: ctx.session.user.client_id!,
			name: params.name,
			description: params.description,
			desk_location_id: params.deskLocationId,
			created_by: ctx.session.user.id,
		})
		.returning([
			'id',
			'name',
			'description',
			'desk_location_id',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Update an existing workflow definition.
 * deskLocationId can be set to null to make the workflow global.
 * Validates that deskLocationId (if provided and not null) belongs to the caller's tenant.
 */
export async function updateWorkflowDefinition(
	ctx: ProtectedContext,
	id: number,
	params: {
		name?: string;
		description?: string;
		deskLocationId?: number | null;
		isActive?: boolean;
	}
) {
	// Validate desk location belongs to caller's tenant before updating
	// (null is valid - it makes the workflow global)
	if (params.deskLocationId !== undefined && params.deskLocationId !== null) {
		await validateDeskLocationBelongsToClient(ctx, params.deskLocationId);
	}

	return await ctx.db
		.updateTable('workflow_definition')
		.set({
			...(params.name !== undefined && { name: params.name }),
			...(params.description !== undefined && { description: params.description }),
			...(params.deskLocationId !== undefined && { desk_location_id: params.deskLocationId }),
			...(params.isActive !== undefined && { is_active: params.isActive }),
			updated_at: new Date().toISOString(),
			updated_by: ctx.session.user.id,
		})
		.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
		.where('workflow_definition.id', '=', id)
		.where('workflow_definition.deleted_at', 'is', null)
		.returning([
			'id',
			'name',
			'description',
			'desk_location_id',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Soft delete a workflow definition.
 * Caller should cascade soft-delete child thresholds and rules in a transaction.
 */
export async function archiveWorkflowDefinition(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('workflow_definition')
		.set({
			deleted_at: new Date().toISOString(),
			deleted_by: ctx.session.user.id,
		})
		.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
		.where('workflow_definition.id', '=', id)
		.where('workflow_definition.deleted_at', 'is', null)
		.returning(['id', 'name'])
		.executeTakeFirstOrThrow();
}

/**
 * Cascade soft-delete all thresholds for a workflow definition.
 * Returns the IDs of archived thresholds for admin logging.
 */
export async function archiveWorkflowThresholdsByDefinition(ctx: ProtectedContext, workflowDefinitionId: number) {
	const archived = await ctx.db
		.updateTable('workflow_threshold')
		.set({
			deleted_at: new Date().toISOString(),
			deleted_by: ctx.session.user.id,
		})
		.where('workflow_threshold.client_id', '=', ctx.session.user.client_id)
		.where('workflow_threshold.workflow_definition_id', '=', workflowDefinitionId)
		.where('workflow_threshold.deleted_at', 'is', null)
		.returning(['id'])
		.execute();
	return archived.map((r) => r.id);
}

/**
 * Cascade soft-delete all rules for a workflow definition.
 * Returns the IDs of archived rules for admin logging.
 */
export async function archiveWorkflowRulesByDefinition(ctx: ProtectedContext, workflowDefinitionId: number) {
	const archived = await ctx.db
		.updateTable('workflow_rule')
		.set({
			deleted_at: new Date().toISOString(),
			deleted_by: ctx.session.user.id,
		})
		.where('workflow_rule.client_id', '=', ctx.session.user.client_id)
		.where('workflow_rule.workflow_definition_id', '=', workflowDefinitionId)
		.where('workflow_rule.deleted_at', 'is', null)
		.returning(['id'])
		.execute();
	return archived.map((r) => r.id);
}

// ============================================================================
// WORKFLOW THRESHOLD QUERIES
// ============================================================================

/**
 * Get all thresholds for a workflow definition.
 */
export async function getWorkflowThresholds(ctx: ProtectedContext, workflowDefinitionId: number) {
	return await ctx.db
		.selectFrom('workflow_threshold')
		.select([
			'workflow_threshold.id',
			'workflow_threshold.workflow_definition_id',
			'workflow_threshold.threshold_type',
			'workflow_threshold.threshold_value',
			'workflow_threshold.is_active',
			'workflow_threshold.created_at',
			'workflow_threshold.created_by',
			'workflow_threshold.updated_at',
			'workflow_threshold.updated_by',
		])
		.where('workflow_threshold.client_id', '=', ctx.session.user.client_id)
		.where('workflow_threshold.workflow_definition_id', '=', workflowDefinitionId)
		.where('workflow_threshold.deleted_at', 'is', null)
		.orderBy('workflow_threshold.threshold_type asc')
		.execute();
}

/**
 * Create a new workflow threshold.
 * Validates that workflowDefinitionId belongs to the caller's tenant.
 */
export async function createWorkflowThreshold(
	ctx: ProtectedContext,
	params: {
		workflowDefinitionId: number;
		thresholdType: WorkflowThresholdType;
		thresholdValue: number;
	}
) {
	// Validate workflow definition belongs to caller's tenant before inserting
	await validateWorkflowDefinitionBelongsToClient(ctx, params.workflowDefinitionId);

	return await ctx.db
		.insertInto('workflow_threshold')
		.values({
			client_id: ctx.session.user.client_id!,
			workflow_definition_id: params.workflowDefinitionId,
			threshold_type: params.thresholdType,
			threshold_value: params.thresholdValue,
			created_by: ctx.session.user.id,
		})
		.returning([
			'id',
			'workflow_definition_id',
			'threshold_type',
			'threshold_value',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Update an existing workflow threshold.
 */
export async function updateWorkflowThreshold(
	ctx: ProtectedContext,
	id: number,
	params: {
		thresholdValue?: number;
		isActive?: boolean;
	}
) {
	return await ctx.db
		.updateTable('workflow_threshold')
		.set({
			...(params.thresholdValue !== undefined && { threshold_value: params.thresholdValue }),
			...(params.isActive !== undefined && { is_active: params.isActive }),
			updated_at: new Date().toISOString(),
			updated_by: ctx.session.user.id,
		})
		.where('workflow_threshold.client_id', '=', ctx.session.user.client_id)
		.where('workflow_threshold.id', '=', id)
		.where('workflow_threshold.deleted_at', 'is', null)
		.returning([
			'id',
			'workflow_definition_id',
			'threshold_type',
			'threshold_value',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Soft delete a workflow threshold.
 */
export async function archiveWorkflowThreshold(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('workflow_threshold')
		.set({
			deleted_at: new Date().toISOString(),
			deleted_by: ctx.session.user.id,
		})
		.where('workflow_threshold.client_id', '=', ctx.session.user.client_id)
		.where('workflow_threshold.id', '=', id)
		.where('workflow_threshold.deleted_at', 'is', null)
		.returning(['id'])
		.executeTakeFirstOrThrow();
}

// ============================================================================
// WORKFLOW RULE QUERIES
// ============================================================================

/**
 * Get all rules for a workflow definition.
 */
export async function getWorkflowRules(ctx: ProtectedContext, workflowDefinitionId: number) {
	return await ctx.db
		.selectFrom('workflow_rule')
		.select([
			'workflow_rule.id',
			'workflow_rule.workflow_definition_id',
			'workflow_rule.name',
			'workflow_rule.description',
			'workflow_rule.trigger_type',
			'workflow_rule.action_type',
			'workflow_rule.action_config',
			'workflow_rule.conditions',
			'workflow_rule.execution_mode',
			'workflow_rule.priority',
			'workflow_rule.is_active',
			'workflow_rule.created_at',
			'workflow_rule.created_by',
			'workflow_rule.updated_at',
			'workflow_rule.updated_by',
		])
		.where('workflow_rule.client_id', '=', ctx.session.user.client_id)
		.where('workflow_rule.workflow_definition_id', '=', workflowDefinitionId)
		.where('workflow_rule.deleted_at', 'is', null)
		.orderBy('workflow_rule.priority asc')
		.orderBy('workflow_rule.name asc')
		.execute();
}

/**
 * Create a new workflow rule.
 * Validates that workflowDefinitionId belongs to the caller's tenant.
 */
export async function createWorkflowRule(
	ctx: ProtectedContext,
	params: {
		workflowDefinitionId: number;
		name: string;
		description?: string;
		triggerType: WorkflowTriggerType;
		actionType: WorkflowActionType;
		actionConfig?: Record<string, unknown>;
		conditions?: { logic: 'AND' | 'OR'; conditions: Record<string, unknown>[] };
		executionMode: WorkflowExecutionMode;
		priority?: number;
	}
) {
	// Validate workflow definition belongs to caller's tenant before inserting
	await validateWorkflowDefinitionBelongsToClient(ctx, params.workflowDefinitionId);

	return await ctx.db
		.insertInto('workflow_rule')
		.values({
			client_id: ctx.session.user.client_id!,
			workflow_definition_id: params.workflowDefinitionId,
			name: params.name,
			description: params.description,
			trigger_type: params.triggerType,
			action_type: params.actionType,
			...(params.actionConfig !== undefined && {
				action_config: JSON.stringify(params.actionConfig),
			}),
			...(params.conditions !== undefined && {
				conditions: JSON.stringify(params.conditions),
			}),
			execution_mode: params.executionMode,
			...(params.priority !== undefined && { priority: params.priority }),
			created_by: ctx.session.user.id,
		})
		.returning([
			'id',
			'workflow_definition_id',
			'name',
			'description',
			'trigger_type',
			'action_type',
			'action_config',
			'conditions',
			'execution_mode',
			'priority',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Update an existing workflow rule.
 */
export async function updateWorkflowRule(
	ctx: ProtectedContext,
	id: number,
	params: {
		name?: string;
		description?: string;
		triggerType?: WorkflowTriggerType;
		actionType?: WorkflowActionType;
		actionConfig?: Record<string, unknown>;
		conditions?: { logic: 'AND' | 'OR'; conditions: Record<string, unknown>[] };
		executionMode?: WorkflowExecutionMode;
		priority?: number;
		isActive?: boolean;
	}
) {
	return await ctx.db
		.updateTable('workflow_rule')
		.set({
			...(params.name !== undefined && { name: params.name }),
			...(params.description !== undefined && { description: params.description }),
			...(params.triggerType !== undefined && { trigger_type: params.triggerType }),
			...(params.actionType !== undefined && { action_type: params.actionType }),
			...(params.actionConfig !== undefined && {
				action_config: JSON.stringify(params.actionConfig),
			}),
			...(params.conditions !== undefined && {
				conditions: JSON.stringify(params.conditions),
			}),
			...(params.executionMode !== undefined && { execution_mode: params.executionMode }),
			...(params.priority !== undefined && { priority: params.priority }),
			...(params.isActive !== undefined && { is_active: params.isActive }),
			updated_at: new Date().toISOString(),
			updated_by: ctx.session.user.id,
		})
		.where('workflow_rule.client_id', '=', ctx.session.user.client_id)
		.where('workflow_rule.id', '=', id)
		.where('workflow_rule.deleted_at', 'is', null)
		.returning([
			'id',
			'workflow_definition_id',
			'name',
			'description',
			'trigger_type',
			'action_type',
			'action_config',
			'conditions',
			'execution_mode',
			'priority',
			'is_active',
			'created_at',
			'created_by',
			'updated_at',
			'updated_by',
		])
		.executeTakeFirstOrThrow();
}

/**
 * Soft delete a workflow rule.
 */
export async function archiveWorkflowRule(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.updateTable('workflow_rule')
		.set({
			deleted_at: new Date().toISOString(),
			deleted_by: ctx.session.user.id,
		})
		.where('workflow_rule.client_id', '=', ctx.session.user.client_id)
		.where('workflow_rule.id', '=', id)
		.where('workflow_rule.deleted_at', 'is', null)
		.returning(['id'])
		.executeTakeFirstOrThrow();
}

// ============================================================================
// WORKFLOW RESOLUTION
// ============================================================================

/**
 * Resolve the workflow definition that applies to a desk location.
 * Returns location-specific workflow if one exists, otherwise falls back to global.
 */
export async function resolveWorkflowForLocation(ctx: ProtectedContext, deskLocationId: number) {
	return await ctx.db
		.selectFrom('workflow_definition')
		.select([
			'workflow_definition.id',
			'workflow_definition.name',
			'workflow_definition.description',
			'workflow_definition.desk_location_id',
			'workflow_definition.is_active',
			'workflow_definition.created_at',
			'workflow_definition.created_by',
			'workflow_definition.updated_at',
			'workflow_definition.updated_by',
		])
		.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
		.where('workflow_definition.is_active', '=', true)
		.where('workflow_definition.deleted_at', 'is', null)
		.where((eb) =>
			eb.or([
				eb('workflow_definition.desk_location_id', '=', deskLocationId),
				eb('workflow_definition.desk_location_id', 'is', null),
			])
		)
		.orderBy(sql`workflow_definition.desk_location_id IS NULL asc`)
		.limit(1)
		.executeTakeFirst();
}
