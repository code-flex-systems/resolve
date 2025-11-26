import type { ProtectedContext } from '@/server/trpc/trpc';
import * as taskQueries from '@/api/queries/taskQueries';
import { logAdminAction, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import { logUserWorkflowAction } from '@/api/utils/activityLogger';
import { TaskStatus, TaskType } from '@/config/enums';

// ============================================================================
// TASK QUERY CONTROLLERS
// ============================================================================

/**
 * Get paginated list of tasks with filters
 */
export async function getTasks(
	ctx: ProtectedContext,
	params: {
		deskLocationId?: number;
		claimId?: number;
		status?: TaskStatus;
		taskType?: TaskType;
		assignedBy?: string;
		claimedBy?: string;
		searchTerm?: string;
		limit?: number;
		offset?: number;
		showCancelled?: boolean;
	}
) {
	return await taskQueries.getTasks(ctx, params);
}

/**
 * Get single task by ID
 */
export async function getTask(ctx: ProtectedContext, { id }: { id: number }) {
	return await taskQueries.getTask(ctx, id);
}

/**
 * Get tasks for a specific claim
 */
export async function getTasksByClaim(
	ctx: ProtectedContext,
	{
		claimId,
		showCancelled,
	}: {
		claimId: number;
		showCancelled?: boolean;
	}
) {
	return await taskQueries.getTasksByClaim(ctx, claimId, showCancelled);
}

/**
 * Get tasks for a specific desk location
 */
export async function getTasksByDeskLocation(
	ctx: ProtectedContext,
	{
		deskLocationId,
		status,
		showCancelled,
		limit,
		offset,
	}: {
		deskLocationId: number;
		status?: TaskStatus;
		showCancelled?: boolean;
		limit?: number;
		offset?: number;
	}
) {
	return await taskQueries.getTasksByDeskLocation(ctx, deskLocationId, {
		status,
		showCancelled,
		limit,
		offset,
	});
}

/**
 * Get tasks visible to current user (via desk location assignments)
 */
export async function getTasksForUser(
	ctx: ProtectedContext,
	params?: {
		userId?: string;
		status?: TaskStatus;
		limit?: number;
		offset?: number;
	}
) {
	return await taskQueries.getTasksForUser(ctx, params);
}

/**
 * Get desk location capacity usage
 */
export async function getDeskCapacity(
	ctx: ProtectedContext,
	{ deskLocationId, date }: { deskLocationId: number; date?: string }
) {
	return await taskQueries.getDeskCapacity(ctx, deskLocationId, date);
}

/**
 * Get task counts by status for a desk location
 */
export async function getTaskCountsByStatus(
	ctx: ProtectedContext,
	{ deskLocationId }: { deskLocationId: number }
) {
	return await taskQueries.getTaskCountsByStatus(ctx, deskLocationId);
}

// ============================================================================
// TASK MUTATION CONTROLLERS
// ============================================================================

/**
 * Create a new task with admin logging
 * Uses transaction to ensure task creation and admin logging are atomic
 */
export async function createTask(
	ctx: ProtectedContext,
	input: {
		claimId: number;
		deskLocationId: number;
		taskType?: TaskType;
		title: string;
		description?: string;
		deadlineDate?: string;
		deadlineDescription?: string;
		workUnits?: number;
	}
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.createTask(trxCtx, input);

		await logAdminAction(trxCtx, {
			entityId: task.id,
			entityName: EntityName.TASK,
			action: AdminAction.CREATE,
			value: {
				title: task.title,
				deskLocationId: task.desk_location_id,
				claimId: task.claim_id,
				taskType: task.task_type,
				workUnits: task.work_units,
			},
		});

		return task;
	});
}

/**
 * Update task details with admin logging
 * Uses transaction to ensure task update and admin logging are atomic
 */
export async function updateTask(
	ctx: ProtectedContext,
	{
		id,
		params,
	}: {
		id: number;
		params: {
			title?: string;
			description?: string;
			dueDate?: string | null;
			workUnits?: number;
			deskLocationId?: number;
		};
	}
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.updateTask(trxCtx, id, params);

		await logAdminAction(trxCtx, {
			entityId: task.id,
			entityName: EntityName.TASK,
			action: AdminAction.UPDATE,
			value: params,
		});

		return task;
	});
}

/**
 * Claim task (start working on it)
 * Logs user workflow action to claim_activity_logs
 */
export async function claimTask(ctx: ProtectedContext, { id }: { id: number }) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.claimTask(trxCtx, id);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_claim',
			entityId: task.id,
		});

		return task;
	});
}

/**
 * Unclaim task (release it back to queue)
 * Logs user workflow action to claim_activity_logs
 */
export async function unclaimTask(ctx: ProtectedContext, { id }: { id: number }) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.unclaimTask(trxCtx, id);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_unclaim',
			entityId: task.id,
		});

		return task;
	});
}

/**
 * Complete task with user workflow logging
 * Uses transaction to ensure task completion and logging are atomic
 */
export async function completeTask(
	ctx: ProtectedContext,
	{ id, completionNotes }: { id: number; completionNotes?: string }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.completeTask(trxCtx, id, completionNotes);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_complete',
			entityId: task.id,
			value: {
				completionNotes,
			},
		});

		return task;
	});
}

/**
 * Cancel task with admin logging
 * Uses transaction to ensure task cancellation and admin logging are atomic
 */
export async function cancelTask(
	ctx: ProtectedContext,
	{ id, cancellationReason }: { id: number; cancellationReason: string }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.cancelTask(trxCtx, id, cancellationReason);

		await logAdminAction(trxCtx, {
			entityId: task.id,
			entityName: EntityName.TASK,
			action: AdminAction.DELETE,
			value: {
				action: 'cancel',
				cancellationReason,
			},
		});

		return task;
	});
}

// ============================================================================
// ADMIN TASK MANAGEMENT CONTROLLERS
// ============================================================================

/**
 * Get tasks by due date week (for admin task management view)
 */
export async function getTasksByDueDateWeek(
	ctx: ProtectedContext,
	params: {
		weekStart: string;
		weekEnd: string;
	}
) {
	return await taskQueries.getTasksByDueDateWeek(ctx, params);
}

/**
 * Bulk cancel multiple tasks with admin logging
 * Uses transaction to ensure bulk cancellation and admin logging are atomic
 */
export async function bulkCancelTasks(
	ctx: ProtectedContext,
	{ ids, cancellationReason }: { ids: number[]; cancellationReason: string }
) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const result = await taskQueries.bulkCancelTasks(trxCtx, { ids, cancellationReason });

		// Log admin action for bulk cancel
		await logAdminAction(trxCtx, {
			entityId: 0, // Bulk action, no single entity
			entityName: EntityName.TASK,
			action: AdminAction.DELETE,
			value: {
				action: 'bulk_cancel',
				taskIds: ids,
				cancelledCount: result.cancelledCount,
				cancellationReason,
			},
		});

		return result;
	});
}
