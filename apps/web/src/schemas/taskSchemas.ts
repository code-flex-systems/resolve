import { z } from 'zod';
import { TaskStatus, TaskType } from '@/config/enums';

// ============================================================================
// TASK SCHEMAS
// ============================================================================

/**
 * Get tasks list with pagination and filters
 */
export const getTasksInput = z.object({
	// Filter by desk location
	deskLocationId: z.string().uuid().optional(),
	// Filter by claim
	claimId: z.string().uuid().optional(),
	// Filter by derived status
	status: z.nativeEnum(TaskStatus).optional(),
	// Filter by task type
	taskType: z.nativeEnum(TaskType).optional(),
	// Filter by assigned user
	assignedTo: z.string().uuid().optional(),
	// Search
	searchTerm: z.string().optional(),
	// Pagination
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	// Include cancelled tasks (tasks with cancelled deadline)
	showCancelled: z.boolean().optional(),
});
export type GetTasksInput = z.infer<typeof getTasksInput>;

/**
 * Get single task by ID
 */
export const getTaskInput = z.object({
	id: z.string().uuid(),
});
export type GetTaskInput = z.infer<typeof getTaskInput>;

/**
 * Get tasks for a specific claim
 */
export const getTasksByClaimInput = z.object({
	claimId: z.string().uuid(),
	showCancelled: z.boolean().optional(),
});
export type GetTasksByClaimInput = z.infer<typeof getTasksByClaimInput>;

/**
 * Get tasks for a specific desk location
 */
export const getTasksByDeskLocationInput = z.object({
	deskLocationId: z.string().uuid(),
	status: z.nativeEnum(TaskStatus).optional(),
	showCancelled: z.boolean().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type GetTasksByDeskLocationInput = z.infer<typeof getTasksByDeskLocationInput>;

/**
 * Get tasks visible to a specific user (via their desk location assignments)
 */
export const getTasksForUserInput = z.object({
	userId: z.string().uuid().optional(), // If not provided, uses current user
	status: z.nativeEnum(TaskStatus).optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type GetTasksForUserInput = z.infer<typeof getTasksForUserInput>;

/**
 * Create task input
 */
export const createTaskInput = z.object({
	// Which claim this task is for
	claimId: z.string().uuid(),
	// Which desk should work this task
	deskLocationId: z.string().uuid(),
	// Task details
	taskType: z.nativeEnum(TaskType).optional().default(TaskType.GENERIC),
	title: z.string().min(1).max(255),
	description: z.string().max(2000).optional(),
	workUnits: z.number().int().min(1).max(100).optional().default(2),
	assignedTo: z.string().uuid().optional(),
	// Optional deadline fields (creates linked deadline if provided)
	deadlineDate: z.string().optional(), // ISO date string
	deadlineDescription: z.string().max(500).optional(),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

/**
 * Update task input
 */
export const updateTaskInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		title: z.string().min(1).max(255).optional(),
		description: z.string().max(2000).optional(),
		dueDate: z.string().nullable().optional(), // ISO date string, null to remove deadline
		workUnits: z.number().int().min(1).max(100).optional(),
		deskLocationId: z.string().uuid().optional(),
	}),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

/**
 * Assign task to a user
 */
export const assignTaskInput = z.object({
	id: z.string().uuid(),
	userId: z.string().uuid(),
});
export type AssignTaskInput = z.infer<typeof assignTaskInput>;

/**
 * Unassign task (clear assignment)
 */
export const unassignTaskInput = z.object({
	id: z.string().uuid(),
});
export type UnassignTaskInput = z.infer<typeof unassignTaskInput>;

/**
 * Start task (begin working on it)
 */
export const startTaskInput = z.object({
	id: z.string().uuid(),
});
export type StartTaskInput = z.infer<typeof startTaskInput>;

/**
 * Complete task input
 */
export const completeTaskInput = z.object({
	id: z.string().uuid(),
	completionNotes: z.string().max(2000).optional(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskInput>;

/**
 * Cancel task input
 */
export const cancelTaskInput = z.object({
	id: z.string().uuid(),
	cancellationReason: z.string().min(1).max(500),
});
export type CancelTaskInput = z.infer<typeof cancelTaskInput>;

/**
 * Get desk location capacity usage
 */
export const getDeskCapacityInput = z.object({
	deskLocationId: z.string().uuid(),
	date: z.string().optional(), // ISO date string, defaults to today
});
export type GetDeskCapacityInput = z.infer<typeof getDeskCapacityInput>;

/**
 * Get task counts by status for a desk location
 */
export const getTaskCountsByStatusInput = z.object({
	deskLocationId: z.string().uuid(),
});
export type GetTaskCountsByStatusInput = z.infer<typeof getTaskCountsByStatusInput>;

// ============================================================================
// ADMIN TASK MANAGEMENT SCHEMAS
// ============================================================================

/**
 * Get tasks by due date week (for admin task management view)
 */
export const getTasksByDueDateWeekInput = z.object({
	weekStart: z.string(), // ISO date string (YYYY-MM-DD)
	weekEnd: z.string(), // ISO date string (YYYY-MM-DD)
});
export type GetTasksByDueDateWeekInput = z.infer<typeof getTasksByDueDateWeekInput>;

/**
 * Bulk cancel tasks input
 */
export const bulkCancelTasksInput = z.object({
	ids: z.array(z.string().uuid()).min(1).max(100),
	cancellationReason: z.string().min(1).max(500),
});
export type BulkCancelTasksInput = z.infer<typeof bulkCancelTasksInput>;
