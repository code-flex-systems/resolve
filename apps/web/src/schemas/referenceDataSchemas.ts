import { z } from 'zod';

// ============================================================================
// KNOWN REFERENCE ENTITIES
// ============================================================================

/**
 * List of known reference entity types
 * Used for validation and type safety
 */
export const KNOWN_REFERENCE_ENTITIES = [
	'line_of_business',
	'loss_type',
	'coverage_type',
	'claim_substatus',
	'facilitator_category',
	'entity_category',
	'claim_party_role',
	'claimant_party_role',
	'adverse_party_role',
] as const;

export type ReferenceEntity = (typeof KNOWN_REFERENCE_ENTITIES)[number];

/**
 * Zod schema for reference entity validation
 */
export const referenceEntitySchema = z.enum(KNOWN_REFERENCE_ENTITIES);

// ============================================================================
// REFERENCE LIST SCHEMAS (Read-Only)
// ============================================================================

/**
 * Get all reference lists (no input needed)
 */
export const getReferenceListsInput = z.object({}).optional();
export type GetReferenceListsInput = z.infer<typeof getReferenceListsInput>;

/**
 * Get single reference list by entity name
 */
export const getReferenceListInput = z.object({
	entity: referenceEntitySchema,
});
export type GetReferenceListInput = z.infer<typeof getReferenceListInput>;

// ============================================================================
// REFERENCE OPTION SCHEMAS
// ============================================================================

/**
 * Get options for a reference entity
 */
export const getReferenceOptionsInput = z.object({
	entity: referenceEntitySchema,
	showInactive: z.boolean().optional(),
	showDeleted: z.boolean().optional(),
});
export type GetReferenceOptionsInput = z.infer<typeof getReferenceOptionsInput>;

/**
 * Get single reference option by entity and value
 */
export const getReferenceOptionInput = z.object({
	entity: referenceEntitySchema,
	value: z.string().min(1),
	includeDeactivated: z.boolean().optional(),
});
export type GetReferenceOptionInput = z.infer<typeof getReferenceOptionInput>;

/**
 * Create reference option input
 * Value must be lowercase, numbers, underscores only
 */
export const createReferenceOptionInput = z.object({
	entity: referenceEntitySchema,
	value: z
		.string()
		.min(1)
		.max(100)
		.regex(
			/^[a-z0-9_]+$/,
			'Value must be lowercase letters, numbers, and underscores only'
		),
	display_label: z.string().min(1).max(255),
	description: z.string().max(500).optional(),
	icon_emoji: z
		.string()
		.max(10)
		.optional()
		.refine(
			(val) => !val || /\p{Extended_Pictographic}/u.test(val),
			'Must be a valid emoji'
		),
	color_hex: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #FF5733)')
		.optional(),
});
export type CreateReferenceOptionInput = z.infer<typeof createReferenceOptionInput>;

/**
 * Update reference option input
 * Note: value cannot be changed after creation
 */
export const updateReferenceOptionInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		display_label: z.string().min(1).max(255).optional(),
		description: z.string().max(500).optional(),
		icon_emoji: z
			.string()
			.max(10)
			.optional()
			.refine(
				(val) => !val || /\p{Extended_Pictographic}/u.test(val),
				'Must be a valid emoji'
			),
		color_hex: z
			.string()
			.regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color')
			.optional(),
		is_active: z.boolean().optional(),
	}),
});
export type UpdateReferenceOptionInput = z.infer<typeof updateReferenceOptionInput>;

/**
 * Delete reference option input (soft delete)
 */
export const deleteReferenceOptionInput = z.object({
	id: z.number().int().positive(),
});
export type DeleteReferenceOptionInput = z.infer<typeof deleteReferenceOptionInput>;

/**
 * Restore reference option input
 */
export const restoreReferenceOptionInput = z.object({
	id: z.number().int().positive(),
});
export type RestoreReferenceOptionInput = z.infer<typeof restoreReferenceOptionInput>;

// ============================================================================
// DISPLAY CONFIGURATIONS
// ============================================================================

/**
 * Display configuration for reference entity tabs in admin UI
 */
export const REFERENCE_ENTITY_DISPLAY: Record<
	ReferenceEntity,
	{ label: string; description: string }
> = {
	line_of_business: {
		label: 'Line of Business',
		description: 'Insurance line of business classification',
	},
	loss_type: {
		label: 'Loss Type',
		description: 'Type of loss or damage',
	},
	coverage_type: {
		label: 'Coverage Type',
		description: 'Type of insurance coverage',
	},
	claim_substatus: {
		label: 'Claim Substatus',
		description: 'Detailed claim workflow status',
	},
	facilitator_category: {
		label: 'Facilitator Category',
		description: 'Category of facilitator parties',
	},
	entity_category: {
		label: 'Entity Category',
		description: 'Category of entity parties',
	},
	claim_party_role: {
		label: 'Claim Party Role',
		description: 'Role of a party on a specific claim',
	},
	claimant_party_role: {
		label: 'Claimant Party Role',
		description: 'Roles for parties on the Claimants & Coverage tab',
	},
	adverse_party_role: {
		label: 'Adverse Party Role',
		description: 'Roles for parties on the Adverse Parties & Liability tab',
	},
};
