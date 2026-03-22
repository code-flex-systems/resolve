import { z } from 'zod';
import { parseDate } from '@/lib/parsers/zodParsers';
import { DeadlineEntityType, DeadlineStatus } from '@/config/enums';

// =====================================================================
// DEADLINE SCHEMAS
// =====================================================================

/**
 * Create deadline input (standalone or linked to entity)
 * Deadlines are non-editable - to change, cancel and recreate
 */
export const createDeadlineInput = z.object({
	// Polymorphic entity linking (optional - if not provided, it's a manual deadline)
	entityType: z.nativeEnum(DeadlineEntityType).optional(),
	entityId: z.string().uuid().optional(),
	// Deadline details
	claimId: z.string().uuid(),
	deadlineType: z.string().min(1).max(100),
	deadlineDate: z.string(), // ISO date string
	description: z.string().max(500).optional(),
});
export type CreateDeadlineInput = z.infer<typeof createDeadlineInput>;

/**
 * Cancel deadline input
 */
export const cancelDeadlineInput = z.object({
	deadlineId: z.string().uuid(),
	cancellationReason: z.string().min(1).max(500),
});
export type CancelDeadlineInput = z.infer<typeof cancelDeadlineInput>;

/**
 * Mark deadline as met/missed (typically done automatically)
 */
export const syncDeadlineStatusInput = z.object({
	deadlineId: z.string().uuid(),
	status: z.nativeEnum(DeadlineStatus),
	completedBy: z.string().uuid().optional(),
});
export type SyncDeadlineStatusInput = z.infer<typeof syncDeadlineStatusInput>;

// Alias for router compatibility
export const updateDeadlineStatusInput = syncDeadlineStatusInput;
export type UpdateDeadlineStatusInput = SyncDeadlineStatusInput;

/**
 * Delete deadline input (alias for cancel)
 */
export const deleteDeadlineInput = z.object({
	deadlineId: z.string().uuid(),
});
export type DeleteDeadlineInput = z.infer<typeof deleteDeadlineInput>;

/**
 * Deadline params for controller (used by createDeadline)
 */
export const deadlineParams = z.object({
	deadlineType: z.string().min(1).max(100),
	deadlineDate: z.string(),
	description: z.string().max(500).optional(),
	entityType: z.nativeEnum(DeadlineEntityType).optional(),
	entityId: z.string().uuid().optional(),
});
export type DeadlineParams = z.infer<typeof deadlineParams>;

/**
 * Get deadlines by entity (polymorphic lookup)
 */
export const getDeadlinesByEntityInput = z.object({
	entityType: z.nativeEnum(DeadlineEntityType),
	entityId: z.string().uuid(),
});
export type GetDeadlinesByEntityInput = z.infer<typeof getDeadlinesByEntityInput>;

/**
 * List deadlines with filters
 */
export const listDeadlinesInput = z.object({
	claimId: z.string().uuid().optional(),
	entityType: z.nativeEnum(DeadlineEntityType).optional(),
	status: z.nativeEnum(DeadlineStatus).optional(),
	dateRange: z.tuple([parseDate(), parseDate()]).optional(),
	personalOnly: z.boolean().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
});
export type ListDeadlinesInput = z.infer<typeof listDeadlinesInput>;

/**
 * Get single deadline by ID
 */
export const getDeadlineInput = z.object({
	deadlineId: z.string().uuid(),
});
export type GetDeadlineInput = z.infer<typeof getDeadlineInput>;
