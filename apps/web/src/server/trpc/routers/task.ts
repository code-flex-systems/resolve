import * as taskController from '@/api/controllers/taskController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getTasksInput,
	getTaskInput,
	getTasksByClaimInput,
	getTasksByDeskLocationInput,
	getTasksForUserInput,
	createTaskInput,
	updateTaskInput,
	claimTaskInput,
	unclaimTaskInput,
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
	getTasksByClaim: protectedProcedure
		.input(getTasksByClaimInput)
		.query(async ({ input, ctx }) => {
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
	getTasksForUser: protectedProcedure
		.input(getTasksForUserInput)
		.query(async ({ input, ctx }) => {
			return taskController.getTasksForUser(ctx, input);
		}),

	/**
	 * Get desk location capacity usage (Admin only)
	 */
	getDeskCapacity: protectedProcedure
		.input(getDeskCapacityInput)
		.query(async ({ input, ctx }) => {
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
	 * Claim task (start working on it)
	 * Available to any user who has access to the desk location
	 */
	claimTask: protectedProcedure.input(claimTaskInput).mutation(async ({ input, ctx }) => {
		return taskController.claimTask(ctx, input);
	}),

	/**
	 * Unclaim task (release it back to queue)
	 * Available to any user who has access to the desk location
	 */
	unclaimTask: protectedProcedure.input(unclaimTaskInput).mutation(async ({ input, ctx }) => {
		return taskController.unclaimTask(ctx, input);
	}),

	/**
	 * Complete task
	 * Available to any user who has access to the desk location
	 */
	completeTask: protectedProcedure.input(completeTaskInput).mutation(async ({ input, ctx }) => {
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
