import type { ProtectedContext } from '@/server/trpc/trpc';
import * as taskQueries from '@/api/queries/taskQueries';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName, LogAction, logAction, logUserWorkflowAction } from '@/api/utils/activityLogger';
import { TaskStatus, TaskType } from '@/config/enums';
import { TRPCError } from '@trpc/server';
import config from '@/config/config';
import { onTaskCompleted } from '@/lib/workflow/ruleEventHooks';

// ============================================================================
// TASK QUERY CONTROLLERS
// ============================================================================

/**
 * Get paginated list of tasks with filters
 */
export async function getTasks(
	ctx: ProtectedContext,
	params: {
		deskLocationId?: string;
		claimId?: string;
		status?: TaskStatus;
		taskType?: TaskType;
		assignedTo?: string;
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
export async function getTask(ctx: ProtectedContext, { id }: { id: string }) {
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
		claimId: string;
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
		deskLocationId: string;
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
	{ deskLocationId, date }: { deskLocationId: string; date?: string }
) {
	return await taskQueries.getDeskCapacity(ctx, deskLocationId, date);
}

/**
 * Get task counts by status for a desk location
 */
export async function getTaskCountsByStatus(
	ctx: ProtectedContext,
	{ deskLocationId }: { deskLocationId: string }
) {
	return await taskQueries.getTaskCountsByStatus(ctx, deskLocationId);
}

// ============================================================================
// TASK AUTHORIZATION HELPERS
// ============================================================================

/**
 * Verify the task is assigned and the caller is the assigned user or an admin.
 * Unassigned tasks can only be assigned or cancelled — not started, released, or completed.
 * Throws NOT_FOUND if the task doesn't exist in this client.
 * Throws FORBIDDEN if the task is unassigned or the caller isn't authorized.
 */
export async function requireTaskOwnership(ctx: ProtectedContext, taskId: string) {
	const task = await taskQueries.getTaskOwnership(ctx, taskId);
	if (!task) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
	}
	if (!task.assigned_to) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Task must be assigned before this action can be performed',
		});
	}
	const isAdmin =
		ctx.session.user.role === config.ROLES.ADMIN ||
		ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	if (!isAdmin && task.assigned_to !== ctx.session.user.id) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Only the assigned user or an admin can perform this action',
		});
	}
	return task;
}

/**
 * Verify the target user belongs to the same client as the caller.
 * Throws BAD_REQUEST if the user doesn't exist in this client.
 */
async function requireSameClientUser(ctx: ProtectedContext, userId: string) {
	const user = await ctx.db
		.selectFrom('users')
		.select('users.id')
		.where('users.id', '=', userId)
		.where('users.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
	if (!user) {
		throw new TRPCError({
			code: 'BAD_REQUEST',
			message: 'Target user does not belong to this organization',
		});
	}
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
		claimId: string;
		deskLocationId: string;
		taskType?: TaskType;
		title: string;
		description?: string;
		deadlineDate?: string;
		deadlineDescription?: string;
		workUnits?: number;
		assignedTo?: string;
	}
) {
	// Validate assignedTo user belongs to the same client (prevents cross-tenant assignment)
	if (input.assignedTo) {
		await requireSameClientUser(ctx, input.assignedTo);
	}

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
		id: string;
		params: {
			title?: string;
			description?: string;
			dueDate?: string | null;
			workUnits?: number;
			deskLocationId?: string;
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
 * Assign task to a user
 * Validates target user belongs to the same client before assigning.
 * Non-admins can only assign unassigned tasks (prevents stealing from another user).
 * Logs user workflow action to claim_activity_logs
 */
export async function assignTask(ctx: ProtectedContext, { id, userId }: { id: string; userId: string }) {
	await requireSameClientUser(ctx, userId);

	// Check current task state to prevent non-admins from stealing assignments
	const task = await taskQueries.getTaskOwnership(ctx, id);
	if (!task) {
		throw new TRPCError({ code: 'NOT_FOUND', message: 'Task not found' });
	}
	const isAdmin =
		ctx.session.user.role === config.ROLES.ADMIN ||
		ctx.session.user.role === config.ROLES.SUPER_ADMIN;
	if (!isAdmin && task.assigned_to) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: 'Task is already assigned to another user',
		});
	}

	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.assignTask(trxCtx, id, userId);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_assign',
			entityId: task.id,
			value: { userId },
		});

		return task;
	});
}

/**
 * Unassign task (clear assignment)
 * Logs user workflow action to claim_activity_logs
 */
export async function unassignTask(ctx: ProtectedContext, { id }: { id: string }) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.unassignTask(trxCtx, id);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_unassign',
			entityId: task.id,
		});

		return task;
	});
}

/**
 * Start task (begin working on it)
 * Logs user workflow action to claim_activity_logs
 */
export async function startTask(ctx: ProtectedContext, { id }: { id: string }) {
	return await ctx.db.transaction().execute(async (trx) => {
		const trxCtx = { ...ctx, db: trx };
		const task = await taskQueries.startTask(trxCtx, id);

		await logUserWorkflowAction(trxCtx, {
			claimId: task.claim_id!,
			action: 'task_start',
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
	{ id, completionNotes }: { id: string; completionNotes?: string }
) {
	const result = await ctx.db.transaction().execute(async (trx) => {
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

	// Fire-and-forget: check if any TASK_COMPLETED workflow rules should trigger
	if (result.claim_id) {
		void onTaskCompleted(ctx, result.id, result.claim_id);
	}

	return result;
}

/**
 * Cancel task with admin logging
 * Uses transaction to ensure task cancellation and admin logging are atomic
 */
export async function cancelTask(
	ctx: ProtectedContext,
	{ id, cancellationReason }: { id: string; cancellationReason: string }
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
	{ ids, cancellationReason }: { ids: string[]; cancellationReason: string }
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
