import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type TaskInput = RouterInput['task'];
type TaskOutput = RouterOutput['task'];

/**
 * Custom hook for task tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 */
export function useTaskTrpc() {
	const utils = trpc.useUtils();

	return {
		// ====================================================================
		// TASK QUERY OPERATIONS
		// ====================================================================

		/**
		 * Get paginated list of tasks with filters (Admin only)
		 */
		list: trpc.task.getTasks.useQuery,

		/**
		 * Get single task by ID
		 */
		get: trpc.task.getTask.useQuery,

		/**
		 * Get tasks for a specific claim
		 */
		listByClaim: trpc.task.getTasksByClaim.useQuery,

		/**
		 * Get tasks for a specific desk location (Admin only)
		 */
		listByDeskLocation: trpc.task.getTasksByDeskLocation.useQuery,

		/**
		 * Get tasks visible to current user
		 */
		listForUser: trpc.task.getTasksForUser.useQuery,

		/**
		 * Get desk location capacity usage (Admin only)
		 */
		getDeskCapacity: trpc.task.getDeskCapacity.useQuery,

		/**
		 * Get task counts by status for a desk location (Admin only)
		 */
		getTaskCountsByStatus: trpc.task.getTaskCountsByStatus.useQuery,

		// ====================================================================
		// TASK MUTATION OPERATIONS
		// ====================================================================

		/**
		 * Create a new task (Admin only)
		 * Invalidates task lists and capacity queries
		 */
		create: trpc.task.createTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
				utils.task.getDeskCapacity.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTaskCountsByStatus.invalidate({
					deskLocationId: data.desk_location_id,
				});
			},
		}),

		/**
		 * Update task details (Admin only)
		 * Invalidates task lists and specific task query
		 */
		update: trpc.task.updateTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTask.invalidate({ id: data.id });
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
			},
		}),

		/**
		 * Claim task (start working on it)
		 * Invalidates task lists
		 */
		claim: trpc.task.claimTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTask.invalidate({ id: data.id });
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
				utils.task.getTaskCountsByStatus.invalidate({
					deskLocationId: data.desk_location_id,
				});
			},
		}),

		/**
		 * Unclaim task (release back to queue)
		 * Invalidates task lists
		 */
		unclaim: trpc.task.unclaimTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTask.invalidate({ id: data.id });
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
				utils.task.getTaskCountsByStatus.invalidate({
					deskLocationId: data.desk_location_id,
				});
			},
		}),

		/**
		 * Complete task
		 * Invalidates task lists and capacity queries
		 */
		complete: trpc.task.completeTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTask.invalidate({ id: data.id });
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
				utils.task.getDeskCapacity.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTaskCountsByStatus.invalidate({
					deskLocationId: data.desk_location_id,
				});
			},
		}),

		/**
		 * Cancel task (Admin only)
		 * Invalidates task lists and capacity queries
		 */
		cancel: trpc.task.cancelTask.useMutation({
			onSuccess(data) {
				utils.task.getTasks.invalidate();
				utils.task.getTask.invalidate({ id: data.id });
				utils.task.getTasksByClaim.invalidate({
					claimId: data.claim_id,
				});
				utils.task.getTasksByDeskLocation.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTasksForUser.invalidate();
				utils.task.getDeskCapacity.invalidate({
					deskLocationId: data.desk_location_id,
				});
				utils.task.getTaskCountsByStatus.invalidate({
					deskLocationId: data.desk_location_id,
				});
			},
		}),

		// ====================================================================
		// ADMIN TASK MANAGEMENT OPERATIONS
		// ====================================================================

		/**
		 * Get tasks by due date week (Admin only)
		 * For admin task management view
		 */
		listByDueDateWeek: trpc.task.getTasksByDueDateWeek.useQuery,

		/**
		 * Bulk cancel multiple tasks (Admin only)
		 * Invalidates all task lists
		 */
		bulkCancel: trpc.task.bulkCancelTasks.useMutation({
			onSuccess() {
				// Invalidate all task-related queries
				utils.task.getTasks.invalidate();
				utils.task.getTasksByClaim.invalidate();
				utils.task.getTasksByDeskLocation.invalidate();
				utils.task.getTasksForUser.invalidate();
				utils.task.getTasksByDueDateWeek.invalidate();
			},
		}),
	};
}

/**
 * Export types for use in components
 */
export type Task = NonNullable<TaskOutput['getTask']>;
export type TaskList = TaskOutput['getTasks'];
export type TaskWithPriority = TaskOutput['getTasksForUser']['rows'][number];
