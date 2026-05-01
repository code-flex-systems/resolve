import * as taskController from '@/api/controllers/taskController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import { TRPCError } from '@trpc/server';
import {
	getTasksInput,
	getTaskInput,
	getTasksByClaimInput,
	getTasksByDeskLocationInput,
	getTasksForUserInput,
	createTaskInput,
	updateTaskInput,
	assignTaskInput,
	unassignTaskInput,
	startTaskInput,
	completeTaskInput,
	cancelTaskInput,
	getDeskCapacityInput,
	getTasksByDueDateWeekInput,
	bulkCancelTasksInput,
} from '@/schemas/taskSchemas';

export const taskRouter = router({
	// ========================================================================
	// TASK QUERY OPERATIONS
	// ========================================================================

	/**
	 * Get paginated list of tasks with filters (Admin only)
	 */
	getTasks: protectedProcedure.input(getTasksInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return taskController.getTasks(ctx, input);
	}),

	/**
	 * Get single task by ID
	 */
	getTask: protectedProcedure.input(getTaskInput).query(async ({ input, ctx }) => {
		return taskController.getTask(ctx, input);
	}),

	/**
	 * Get tasks for a specific claim
	 */
	getTasksByClaim: protectedProcedure.input(getTasksByClaimInput).query(async ({ input, ctx }) => {
		return taskController.getTasksByClaim(ctx, input);
	}),

	/**
	 * Get tasks for a specific desk location (Admin only)
	 */
	getTasksByDeskLocation: protectedProcedure
		.input(getTasksByDeskLocationInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return taskController.getTasksByDeskLocation(ctx, input);
		}),

	/**
	 * Get tasks visible to current user (via desk location assignments)
	 */
	getTasksForUser: protectedProcedure.input(getTasksForUserInput).query(async ({ input, ctx }) => {
		return taskController.getTasksForUser(ctx, input);
	}),

	/**
	 * Get desk location capacity usage (Admin only)
	 */
	getDeskCapacity: protectedProcedure.input(getDeskCapacityInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return taskController.getDeskCapacity(ctx, input);
	}),

	/**
	 * Get task counts by status for a desk location (Admin only)
	 */
	getTaskCountsByStatus: protectedProcedure
		.input(getTasksByDeskLocationInput.pick({ deskLocationId: true }))
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return taskController.getTaskCountsByStatus(ctx, input);
		}),

	// ========================================================================
	// TASK MUTATION OPERATIONS
	// ========================================================================

	/**
	 * Create a new task (Admin only)
	 */
	createTask: protectedProcedure.input(createTaskInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return taskController.createTask(ctx, input);
	}),

	/**
	 * Update task details (Admin only)
	 */
	updateTask: protectedProcedure.input(updateTaskInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return taskController.updateTask(ctx, input);
	}),

	/**
	 * Assign task to a user
	 * Admin can assign to anyone; contributor can only assign to themselves
	 */
	assignTask: protectedProcedure.input(assignTaskInput).mutation(async ({ input, ctx }) => {
		const isAdmin =
			ctx.session.user.role === config.ROLES.ADMIN ||
			ctx.session.user.role === config.ROLES.SUPER_ADMIN;
		if (!isAdmin && input.userId !== ctx.session.user.id) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Contributors can only assign tasks to themselves',
			});
		}
		return taskController.assignTask(ctx, input);
	}),

	/**
	 * Unassign task (release assignment, revert to pending)
	 * Requires the assigned user or an admin
	 */
	unassignTask: protectedProcedure.input(unassignTaskInput).mutation(async ({ input, ctx }) => {
		await taskController.requireTaskOwnership(ctx, input.id);
		return taskController.unassignTask(ctx, input);
	}),

	/**
	 * Start task (begin working on it)
	 * Requires the assigned user or an admin
	 */
	startTask: protectedProcedure.input(startTaskInput).mutation(async ({ input, ctx }) => {
		await taskController.requireTaskOwnership(ctx, input.id);
		return taskController.startTask(ctx, input);
	}),

	/**
	 * Complete task
	 * Requires the assigned user or an admin
	 */
	completeTask: protectedProcedure.input(completeTaskInput).mutation(async ({ input, ctx }) => {
		await taskController.requireTaskOwnership(ctx, input.id);
		return taskController.completeTask(ctx, input);
	}),

	/**
	 * Cancel task (Admin only)
	 */
	cancelTask: protectedProcedure.input(cancelTaskInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return taskController.cancelTask(ctx, input);
	}),

	// ========================================================================
	// ADMIN TASK MANAGEMENT OPERATIONS
	// ========================================================================

	/**
	 * Get tasks by due date week (Admin only)
	 * Used for admin task management view with client-side filtering
	 */
	getTasksByDueDateWeek: protectedProcedure
		.input(getTasksByDueDateWeekInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return taskController.getTasksByDueDateWeek(ctx, input);
		}),

	/**
	 * Bulk cancel multiple tasks (Admin only)
	 */
	bulkCancelTasks: protectedProcedure
		.input(bulkCancelTasksInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return taskController.bulkCancelTasks(ctx, input);
		}),
});
