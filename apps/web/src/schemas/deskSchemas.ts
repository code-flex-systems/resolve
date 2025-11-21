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
export type GetDeskLocationTypesInput = z.infer<
	typeof getDeskLocationTypesInput
>;

/**
 * Get single desk location type by ID
 */
export const getDeskLocationTypeInput = z.object({
	id: z.number().int().positive(),
});
export type GetDeskLocationTypeInput = z.infer<typeof getDeskLocationTypeInput>;

/**
 * Create desk location type input
 */
export const createDeskLocationTypeInput = z.object({
	name: z.string().min(1).max(255),
	createDefaultLocations: z.boolean().optional().default(false),
});
export type CreateDeskLocationTypeInput = z.infer<
	typeof createDeskLocationTypeInput
>;

/**
 * Update desk location type input
 */
export const updateDeskLocationTypeInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
	}),
});
export type UpdateDeskLocationTypeInput = z.infer<
	typeof updateDeskLocationTypeInput
>;

/**
 * Delete desk location type input (soft delete)
 */
export const deleteDeskLocationTypeInput = z.object({
	id: z.number().int().positive(),
});
export type DeleteDeskLocationTypeInput = z.infer<
	typeof deleteDeskLocationTypeInput
>;

// ============================================================================
// DESK LOCATION SCHEMAS
// ============================================================================

/**
 * Get desk locations list with pagination and search
 */
export const getDeskLocationsInput = z.object({
	deskLocationTypeId: z.number().int().positive().optional(),
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
	id: z.number().int().positive(),
});
export type GetDeskLocationInput = z.infer<typeof getDeskLocationInput>;

/**
 * Create desk location input
 */
export const createDeskLocationInput = z.object({
	name: z.string().min(1).max(255),
	desk_location_type_id: z.number().int().positive(),
	is_active: z.boolean().optional().default(true),
});
export type CreateDeskLocationInput = z.infer<typeof createDeskLocationInput>;

/**
 * Update desk location input
 */
export const updateDeskLocationInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		name: z.string().min(1).max(255).optional(),
		desk_location_type_id: z.number().int().positive().optional(),
		is_active: z.boolean().optional(),
	}),
});
export type UpdateDeskLocationInput = z.infer<typeof updateDeskLocationInput>;

/**
 * Delete desk location input (soft delete)
 */
export const deleteDeskLocationInput = z.object({
	id: z.number().int().positive(),
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
