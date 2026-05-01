import { z } from 'zod';

// ============================================================================
// DESK LOCATION TYPE SCHEMAS
// ============================================================================

/**
 * Get desk location types list with pagination and search
 */
export const getDeskLocationTypesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showDeleted: z.boolean().optional(),
});
export type GetDeskLocationTypesInput = z.infer<typeof getDeskLocationTypesInput>;

/**
 * Get single desk location type by ID
 */
export const getDeskLocationTypeInput = z.object({
	id: z.string().uuid(),
});
export type GetDeskLocationTypeInput = z.infer<typeof getDeskLocationTypeInput>;

/**
 * Create desk location type input
 */
export const createDeskLocationTypeInput = z.object({
	name: z.string().min(1).max(255),
	createDefaultLocations: z.boolean().optional().default(false),
});
export type CreateDeskLocationTypeInput = z.infer<typeof createDeskLocationTypeInput>;

/**
 * Update desk location type input
 */
export const updateDeskLocationTypeInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
	}),
});
export type UpdateDeskLocationTypeInput = z.infer<typeof updateDeskLocationTypeInput>;

/**
 * Delete desk location type input (soft delete)
 */
export const deleteDeskLocationTypeInput = z.object({
	id: z.string().uuid(),
});
export type DeleteDeskLocationTypeInput = z.infer<typeof deleteDeskLocationTypeInput>;

// ============================================================================
// DESK LOCATION SCHEMAS
// ============================================================================

/**
 * Get desk locations list with pagination and search
 */
export const getDeskLocationsInput = z.object({
	deskLocationTypeId: z.string().uuid().optional(),
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showDeleted: z.boolean().optional(),
	showInactive: z.boolean().optional(),
});
export type GetDeskLocationsInput = z.infer<typeof getDeskLocationsInput>;

/**
 * Get single desk location by ID
 */
export const getDeskLocationInput = z.object({
	id: z.string().uuid(),
});
export type GetDeskLocationInput = z.infer<typeof getDeskLocationInput>;

/**
 * Create desk location input
 */
export const createDeskLocationInput = z.object({
	name: z.string().min(1).max(255),
	desk_location_type_id: z.string().uuid(),
	is_active: z.boolean().optional().default(true),
	capacity_threshold: z.number().int().positive(),
});
export type CreateDeskLocationInput = z.infer<typeof createDeskLocationInput>;

/**
 * Update desk location input
 */
export const updateDeskLocationInput = z.object({
	id: z.string().uuid(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
		desk_location_type_id: z.string().uuid().optional(),
		is_active: z.boolean().optional(),
		capacity_threshold: z.number().int().positive().optional(),
	}),
});
export type UpdateDeskLocationInput = z.infer<typeof updateDeskLocationInput>;

/**
 * Delete desk location input (soft delete)
 */
export const deleteDeskLocationInput = z.object({
	id: z.string().uuid(),
});
export type DeleteDeskLocationInput = z.infer<typeof deleteDeskLocationInput>;

// ============================================================================
// SUGGESTED DEFAULT LOCATIONS
// ============================================================================

/**
 * Suggested default desk locations based on team correspondence
 * These are offered when creating a new desk location type
 */
export const SUGGESTED_DESK_LOCATIONS = [
	'Pending',
	'Transactional',
	'Closed',
	'Referral',
	'Statute Expiration',
	'Hold',
] as const;

export type SuggestedDeskLocation = (typeof SUGGESTED_DESK_LOCATIONS)[number];

// ============================================================================
// USER DESK LOCATION ASSIGNMENT SCHEMAS (Phase 2)
// ============================================================================

/**
 * Get user desk location assignments for a specific user
 */
export const getUserDeskLocationsInput = z.object({
	userId: z.string().uuid(),
});
export type GetUserDeskLocationsInput = z.infer<typeof getUserDeskLocationsInput>;

/**
 * Get users assigned to a specific desk location
 */
export const getDeskLocationUsersInput = z.object({
	deskLocationId: z.string().uuid(),
});
export type GetDeskLocationUsersInput = z.infer<typeof getDeskLocationUsersInput>;

/**
 * Assign user to desk location with priority
 */
export const assignUserToDeskLocationInput = z.object({
	userId: z.string().uuid(),
	deskLocationId: z.string().uuid(),
	priority: z.number().int().min(1).max(5),
});
export type AssignUserToDeskLocationInput = z.infer<typeof assignUserToDeskLocationInput>;

/**
 * Bulk assign multiple users to the same desk location with the same priority
 * All-or-nothing transaction
 */
export const bulkAssignUsersToDeskLocationInput = z.object({
	userIds: z.array(z.string().uuid()).min(1).max(50),
	deskLocationId: z.string().uuid(),
	priority: z.number().int().min(1).max(5),
});
export type BulkAssignUsersToDeskLocationInput = z.infer<typeof bulkAssignUsersToDeskLocationInput>;

/**
 * Update user desk location assignment priority
 */
export const updateUserDeskLocationPriorityInput = z.object({
	id: z.string().uuid(),
	priority: z.number().int().min(1).max(5),
});
export type UpdateUserDeskLocationPriorityInput = z.infer<
	typeof updateUserDeskLocationPriorityInput
>;

/**
 * Remove user from desk location (soft delete)
 */
export const removeUserFromDeskLocationInput = z.object({
	id: z.string().uuid(),
});
export type RemoveUserFromDeskLocationInput = z.infer<typeof removeUserFromDeskLocationInput>;

/**
 * Bulk update user desk location priorities (for drag-and-drop)
 */
export const updateUserDeskLocationPrioritiesInput = z.object({
	updates: z.array(
		z.object({
			id: z.string().uuid(),
			priority: z.number().int().min(1).max(5),
		})
	),
});
export type UpdateUserDeskLocationPrioritiesInput = z.infer<
	typeof updateUserDeskLocationPrioritiesInput
>;

/**
 * Update user desk assignments (unified endpoint for individual and bulk updates)
 * Accepts an array of users with their complete desired desk assignment state
 */
export const updateUsersDeskAssignmentsInput = z.object({
	updates: z
		.array(
			z.object({
				userId: z.string().uuid(),
				assignments: z
					.array(
						z.object({
							deskLocationId: z.string().uuid(),
							priority: z.number().int().min(1).max(5),
						})
					)
					.max(5), // Max 5 assignments per user
			})
		)
		.min(1)
		.max(50), // Support 1-50 users per bulk update
});
export type UpdateUsersDeskAssignmentsInput = z.infer<typeof updateUsersDeskAssignmentsInput>;

// ============================================================================
// CLAIM DESK LOCATION TRANSITION SCHEMAS
// ============================================================================

/**
 * Create a claim desk location transition record
 */
export const createClaimTransitionInput = z.object({
	claimId: z.string().uuid(),
	deskLocationId: z.string().uuid(),
	previousDeskLocationId: z.string().uuid().optional(),
	enteredReason: z.string().optional(),
});
export type CreateClaimTransitionInput = z.infer<typeof createClaimTransitionInput>;

/**
 * Get claim desk location transitions for a specific claim
 */
export const getClaimTransitionsInput = z.object({
	claimId: z.string().uuid(),
});
export type GetClaimTransitionsInput = z.infer<typeof getClaimTransitionsInput>;
