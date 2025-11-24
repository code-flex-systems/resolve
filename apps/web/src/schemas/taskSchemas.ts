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
	deskLocationId: z.number().int().positive().optional(),
	// Filter by claim
	claimId: z.number().int().positive().optional(),
	// Filter by status
	status: z.nativeEnum(TaskStatus).optional(),
	// Filter by task type
	taskType: z.nativeEnum(TaskType).optional(),
	// Filter by assigned user
	assignedBy: z.string().uuid().optional(),
	// Filter by claimed user
	claimedBy: z.string().uuid().optional(),
	// Search
	searchTerm: z.string().optional(),
	// Pagination
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	// Include cancelled tasks
	showCancelled: z.boolean().optional(),
});
export type GetTasksInput = z.infer<typeof getTasksInput>;

/**
 * Get single task by ID
 */
export const getTaskInput = z.object({
	id: z.number().int().positive(),
});
export type GetTaskInput = z.infer<typeof getTaskInput>;

/**
 * Get tasks for a specific claim
 */
export const getTasksByClaimInput = z.object({
	claimId: z.number().int().positive(),
	showCancelled: z.boolean().optional(),
});
export type GetTasksByClaimInput = z.infer<typeof getTasksByClaimInput>;

/**
 * Get tasks for a specific desk location
 */
export const getTasksByDeskLocationInput = z.object({
	deskLocationId: z.number().int().positive(),
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
	claimId: z.number().int().positive(),
	// Which desk should work this task
	deskLocationId: z.number().int().positive(),
	// Task details
	taskType: z.nativeEnum(TaskType).optional().default(TaskType.GENERIC),
	title: z.string().min(1).max(255),
	description: z.string().max(2000).optional(),
	dueDate: z.string().optional(), // ISO date string
	workUnits: z.number().int().min(1).max(100).optional().default(2),
});
export type CreateTaskInput = z.infer<typeof createTaskInput>;

/**
 * Update task input
 */
export const updateTaskInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		title: z.string().min(1).max(255).optional(),
		description: z.string().max(2000).optional(),
		dueDate: z.string().nullable().optional(), // ISO date string, null to clear
		workUnits: z.number().int().min(1).max(100).optional(),
		deskLocationId: z.number().int().positive().optional(),
	}),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInput>;

/**
 * Claim task (start working on it)
 */
export const claimTaskInput = z.object({
	id: z.number().int().positive(),
});
export type ClaimTaskInput = z.infer<typeof claimTaskInput>;

/**
 * Unclaim task (release it back to queue)
 */
export const unclaimTaskInput = z.object({
	id: z.number().int().positive(),
});
export type UnclaimTaskInput = z.infer<typeof unclaimTaskInput>;

/**
 * Complete task input
 */
export const completeTaskInput = z.object({
	id: z.number().int().positive(),
	completionNotes: z.string().max(2000).optional(),
});
export type CompleteTaskInput = z.infer<typeof completeTaskInput>;

/**
 * Cancel task input
 */
export const cancelTaskInput = z.object({
	id: z.number().int().positive(),
	cancellationReason: z.string().min(1).max(500),
});
export type CancelTaskInput = z.infer<typeof cancelTaskInput>;

/**
 * Get desk location capacity usage
 */
export const getDeskCapacityInput = z.object({
	deskLocationId: z.number().int().positive(),
	date: z.string().optional(), // ISO date string, defaults to today
});
export type GetDeskCapacityInput = z.infer<typeof getDeskCapacityInput>;

/**
 * Get task counts by status for a desk location
 */
export const getTaskCountsByStatusInput = z.object({
	deskLocationId: z.number().int().positive(),
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
	ids: z.array(z.number().int().positive()).min(1).max(100),
	cancellationReason: z.string().min(1).max(500),
});
export type BulkCancelTasksInput = z.infer<typeof bulkCancelTasksInput>;
