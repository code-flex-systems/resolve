import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { TRPCError } from '@trpc/server';
import {
	WorkflowTriggerType,
	WorkflowActionType,
	WorkflowExecutionMode,
	WorkflowThresholdType,
	RuleExecutionStatus,
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
	deskLocationId: string
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
	workflowDefinitionId: string
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
 * Get all workflow definitions with optional active filter.
 * Left joins desk_location to include location name for scoped workflows.
 */
export async function getWorkflowDefinitions(
	ctx: ProtectedContext,
	isActive?: boolean
) {
	let query = ctx.db
		.selectFrom('workflow_definition')
		.leftJoin('desk_location', 'desk_location.id', 'workflow_definition.desk_location_id')
		.leftJoin('users as creator', (join) =>
			join
				.onRef('creator.id', '=', 'workflow_definition.created_by')
				.on('creator.client_id', '=', ctx.session.user.client_id)
		)
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
		.select(['creator.first as creator_first_name', 'creator.last as creator_last_name'])
		.where('workflow_definition.client_id', '=', ctx.session.user.client_id)
		.where('workflow_definition.deleted_at', 'is', null);

	if (isActive !== undefined) {
		query = query.where('workflow_definition.is_active', '=', isActive);
	}

	const rows = await query.orderBy('workflow_definition.name asc').execute();

	return { rows, count: rows.length };
}

/**
 * Get single workflow definition by ID.
 * Loads thresholds and rules in parallel for the detail view.
 */
export async function getWorkflowDefinition(ctx: ProtectedContext, id: string) {
	const [definition, thresholds, rules] = await Promise.all([
		ctx.db
			.selectFrom('workflow_definition')
			.leftJoin('desk_location', 'desk_location.id', 'workflow_definition.desk_location_id')
			.leftJoin('users as creator', (join) =>
				join
					.onRef('creator.id', '=', 'workflow_definition.created_by')
					.on('creator.client_id', '=', ctx.session.user.client_id)
			)
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
			.select(['creator.first as creator_first_name', 'creator.last as creator_last_name'])
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
		deskLocationId?: string;
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
	id: string,
	params: {
		name?: string;
		description?: string;
		deskLocationId?: string | null;
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
export async function archiveWorkflowDefinition(ctx: ProtectedContext, id: string) {
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
export async function archiveWorkflowThresholdsByDefinition(ctx: ProtectedContext, workflowDefinitionId: string) {
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
export async function archiveWorkflowRulesByDefinition(ctx: ProtectedContext, workflowDefinitionId: string) {
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
export async function getWorkflowThresholds(ctx: ProtectedContext, workflowDefinitionId: string) {
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
		workflowDefinitionId: string;
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
	id: string,
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
export async function archiveWorkflowThreshold(ctx: ProtectedContext, id: string) {
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
export async function getWorkflowRules(ctx: ProtectedContext, workflowDefinitionId: string) {
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
		workflowDefinitionId: string;
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
	id: string,
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
export async function archiveWorkflowRule(ctx: ProtectedContext, id: string) {
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
export async function resolveWorkflowForLocation(ctx: ProtectedContext, deskLocationId: string) {
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

// ============================================================================
// RULE EXECUTION QUERIES
// ============================================================================

/**
 * Find active rules matching a trigger type, optionally scoped to a desk location's workflow.
 * Joins to workflow_definition to ensure the parent workflow is also active.
 * Ordered by priority ASC (lower = evaluated first).
 */
export async function getApplicableRules(
	ctx: ProtectedContext,
	params: {
		triggerType: WorkflowTriggerType;
		deskLocationId?: string;
		ruleId?: string;
	}
) {
	let query = ctx.db
		.selectFrom('workflow_rule')
		.innerJoin('workflow_definition', 'workflow_definition.id', 'workflow_rule.workflow_definition_id')
		.select([
			'workflow_rule.id',
			'workflow_rule.name',
			'workflow_rule.trigger_type',
			'workflow_rule.action_type',
			'workflow_rule.action_config',
			'workflow_rule.conditions',
			'workflow_rule.execution_mode',
			'workflow_rule.priority',
		])
		.where('workflow_rule.client_id', '=', ctx.session.user.client_id)
		// Skip trigger_type filter when targeting a specific rule (manual execution)
		.$if(params.ruleId == null, (qb) => qb.where('workflow_rule.trigger_type', '=', params.triggerType))
		.where('workflow_rule.is_active', '=', true)
		.where('workflow_rule.deleted_at', 'is', null)
		.where('workflow_definition.is_active', '=', true)
		.where('workflow_definition.deleted_at', 'is', null);

	if (params.ruleId != null) {
		query = query.where('workflow_rule.id', '=', params.ruleId);
	}

	if (params.deskLocationId != null) {
		// Match location-specific or global workflows
		query = query.where((eb) =>
			eb.or([
				eb('workflow_definition.desk_location_id', '=', params.deskLocationId!),
				eb('workflow_definition.desk_location_id', 'is', null),
			])
		);
	}

	return await query.orderBy('workflow_rule.priority asc').orderBy('workflow_rule.name asc').execute();
}

/**
 * Create a rule execution log entry.
 */
export async function createRuleExecution(
	ctx: ProtectedContext,
	params: {
		workflowRuleId: string;
		claimId: string;
		triggerType: string;
		actionType: string;
		actionConfig: Record<string, unknown>;
		executionMode: string;
		status: RuleExecutionStatus;
		resultData?: Record<string, unknown>;
		errorMessage?: string;
	}
) {
	return await ctx.db
		.insertInto('workflow_rule_execution')
		.values({
			client_id: ctx.session.user.client_id!,
			workflow_rule_id: params.workflowRuleId,
			claim_id: params.claimId,
			trigger_type: params.triggerType,
			action_type: params.actionType,
			action_config: JSON.stringify(params.actionConfig),
			execution_mode: params.executionMode,
			status: params.status,
			result_data: params.resultData ? JSON.stringify(params.resultData) : null,
			error_message: params.errorMessage,
			executed_at: params.status === RuleExecutionStatus.EXECUTED ? new Date() : null,
			executed_by:
				params.status === RuleExecutionStatus.EXECUTED ? ctx.session.user.id : null,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get rule executions with cursor pagination, optionally filtered by rule, claim, or status.
 * Uses cursor-based pagination (created_at + id) for efficient traversal of large tables.
 */
export async function getRuleExecutions(
	ctx: ProtectedContext,
	params: {
		ruleId?: string;
		claimId?: string;
		status?: RuleExecutionStatus;
		limit: number;
		cursor?: { createdAt: string; id: string };
	}
) {
	const { limit, cursor } = params;

	let query = ctx.db
		.selectFrom('workflow_rule_execution')
		.innerJoin('workflow_rule', 'workflow_rule.id', 'workflow_rule_execution.workflow_rule_id')
		.innerJoin('claim', 'claim.id', 'workflow_rule_execution.claim_id')
		.selectAll('workflow_rule_execution')
		.select(['workflow_rule.name as rule_name', 'claim.claim_number'])
		.where('workflow_rule_execution.client_id', '=', ctx.session.user.client_id);

	if (params.ruleId != null) {
		query = query.where('workflow_rule_execution.workflow_rule_id', '=', params.ruleId);
	}

	if (params.claimId != null) {
		query = query.where('workflow_rule_execution.claim_id', '=', params.claimId);
	}

	if (params.status) {
		query = query.where('workflow_rule_execution.status', '=', params.status);
	}

	if (cursor) {
		const cursorDate = new Date(cursor.createdAt);
		query = query.where((eb) =>
			eb.or([
				eb('workflow_rule_execution.created_at', '<', cursorDate),
				eb.and([
					eb('workflow_rule_execution.created_at', '=', cursorDate),
					eb('workflow_rule_execution.id', '<', cursor.id),
				]),
			])
		);
	}

	const rows = await query
		.orderBy('workflow_rule_execution.created_at', 'desc')
		.orderBy('workflow_rule_execution.id', 'desc')
		.limit(limit + 1)
		.execute();

	const hasNextPage = rows.length > limit;
	const trimmedRows = hasNextPage ? rows.slice(0, limit) : rows;
	const lastRow = trimmedRows[trimmedRows.length - 1];
	const nextCursor =
		hasNextPage && lastRow
			? {
					createdAt:
						lastRow.created_at instanceof Date
							? lastRow.created_at.toISOString()
							: new Date(lastRow.created_at).toISOString(),
					id: lastRow.id,
				}
			: null;

	return { rows: trimmedRows, nextCursor, hasNextPage };
}

/**
 * Get pending rule executions with COUNT(*) OVER() pagination.
 * Uses offset-based pagination since the pending set stays small.
 */
export async function getPendingRuleExecutions(
	ctx: ProtectedContext,
	params: {
		ruleId?: string;
		limit: number;
		offset: number;
	}
) {
	let query = ctx.db
		.selectFrom('workflow_rule_execution')
		.innerJoin('workflow_rule', 'workflow_rule.id', 'workflow_rule_execution.workflow_rule_id')
		.innerJoin('claim', 'claim.id', 'workflow_rule_execution.claim_id')
		.selectAll('workflow_rule_execution')
		.select(['workflow_rule.name as rule_name', 'claim.claim_number'])
		.select(sql<string>`count(*) over()`.as('total_count'))
		.where('workflow_rule_execution.client_id', '=', ctx.session.user.client_id)
		.where('workflow_rule_execution.status', '=', RuleExecutionStatus.PENDING);

	if (params.ruleId != null) {
		query = query.where('workflow_rule_execution.workflow_rule_id', '=', params.ruleId);
	}

	const rowsWithCount = await query
		.orderBy('workflow_rule_execution.created_at', 'desc')
		.limit(params.limit)
		.offset(params.offset)
		.execute();

	const count = rowsWithCount.length > 0 ? parseInt(rowsWithCount[0].total_count ?? '0') : 0;
	const rows = rowsWithCount.map(({ total_count, ...rest }) => rest);

	return { rows, count };
}

/**
 * Update a rule execution's status and result.
 */
export async function updateRuleExecution(
	ctx: ProtectedContext,
	id: string,
	params: {
		status: RuleExecutionStatus;
		resultData?: Record<string, unknown>;
		errorMessage?: string;
	}
) {
	return await ctx.db
		.updateTable('workflow_rule_execution')
		.set({
			status: params.status,
			result_data: params.resultData ? JSON.stringify(params.resultData) : null,
			error_message: params.errorMessage ?? null,
			executed_at: params.status === RuleExecutionStatus.EXECUTED ? new Date() : null,
			executed_by:
				params.status === RuleExecutionStatus.EXECUTED ? ctx.session.user.id : null,
		})
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Get a single rule execution by ID.
 */
export async function getRuleExecution(ctx: ProtectedContext, id: string) {
	return await ctx.db
		.selectFrom('workflow_rule_execution')
		.selectAll()
		.where('id', '=', id)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}
