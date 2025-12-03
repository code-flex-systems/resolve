import { z } from 'zod';
import { PartyType } from '@/config/enums';

// ============================================================================
// PARTY SCHEMAS
// ============================================================================

/**
 * Get parties list with pagination and search
 */
export const getPartiesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().min(0).optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Get single party by ID
 */
export const getPartyInput = z.object({
	id: z.number().int().positive(),
});

/**
 * Search parties for deduplication
 */
export const searchPartiesInput = z.object({
	searchTerm: z.string().min(1),
});

/**
 * Create party input
 */
export const createPartyInput = z.object({
	party_type: z.nativeEnum(PartyType),
	party_category: z.string().min(1), // Validated at application layer based on party_type
	name: z.string().min(2).max(255),
	organization: z.string().max(255).optional(),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().max(50).optional(),
	address: z.string().max(500).optional(),
	notes: z.string().max(2000).optional(),
});

/**
 * Update party input
 */
export const updatePartyInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		party_type: z.nativeEnum(PartyType).optional(),
		party_category: z.string().min(1).optional(),
		name: z.string().min(2).max(255).optional(),
		organization: z.string().max(255).optional(),
		email: z.string().email().optional().or(z.literal('')),
		phone: z.string().max(50).optional(),
		address: z.string().max(500).optional(),
		notes: z.string().max(2000).optional(),
	}),
});

/**
 * Delete party input
 */
export const deletePartyInput = z.object({
	id: z.number().int().positive(),
});

// ============================================================================
// PARTY OFFICE SCHEMAS
// ============================================================================

/**
 * Get party offices
 */
export const getPartyOfficesInput = z.object({
	partyId: z.number().int().positive(),
	showArchived: z.boolean().optional(),
});

/**
 * Get all party offices (for standalone admin tab)
 */
export const getAllPartyOfficesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Create party office input
 */
export const createPartyOfficeInput = z.object({
	party_id: z.number().int().positive(),
	office_name: z.string().max(255).optional(),
	address: z.string().max(500).optional(),
	phone: z.string().max(50).optional(),
	fax: z.string().max(50).optional(),
	is_primary: z.boolean().optional(),
});

/**
 * Update party office input
 */
export const updatePartyOfficeInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		office_name: z.string().max(255).optional(),
		address: z.string().max(500).optional(),
		phone: z.string().max(50).optional(),
		fax: z.string().max(50).optional(),
		is_primary: z.boolean().optional(),
	}),
});

/**
 * Archive party office input (soft delete)
 */
export const archivePartyOfficeInput = z.object({
	id: z.number().int().positive(),
});

/**
 * Delete party office input (for backwards compatibility - now archives)
 */
export const deletePartyOfficeInput = archivePartyOfficeInput;

// ============================================================================
// PARTY REPRESENTATIVE SCHEMAS
// ============================================================================

/**
 * Get party representatives
 */
export const getPartyRepresentativesInput = z.object({
	partyId: z.number().int().positive(),
	officeId: z.number().int().positive().optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Get all party representatives (for standalone admin tab)
 */
export const getAllPartyRepresentativesInput = z.object({
	searchTerm: z.string().optional(),
	limit: z.number().int().positive().optional(),
	offset: z.number().int().nonnegative().optional(),
	showArchived: z.boolean().optional(),
});

/**
 * Create party representative input
 */
export const createPartyRepresentativeInput = z.object({
	party_id: z.number().int().positive(),
	office_id: z.number().int().positive().optional(),
	first_name: z.string().min(1).max(100),
	last_name: z.string().min(1).max(100),
	title: z.string().max(100).optional(),
	email: z.string().email().optional().or(z.literal('')),
	phone: z.string().max(50).optional(),
	mobile_phone: z.string().max(50).optional(),
	fax: z.string().max(50).optional(),
	is_primary: z.boolean().optional(),
});

/**
 * Update party representative input
 */
export const updatePartyRepresentativeInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		office_id: z.number().int().positive().optional(),
		first_name: z.string().min(1).max(100).optional(),
		last_name: z.string().min(1).max(100).optional(),
		title: z.string().max(100).optional(),
		email: z.string().email().optional().or(z.literal('')),
		phone: z.string().max(50).optional(),
		mobile_phone: z.string().max(50).optional(),
		fax: z.string().max(50).optional(),
		is_primary: z.boolean().optional(),
	}),
});

/**
 * Archive party representative input (soft delete)
 */
export const archivePartyRepresentativeInput = z.object({
	id: z.number().int().positive(),
});

/**
 * Restore party representative input
 */
export const restorePartyRepresentativeInput = z.object({
	id: z.number().int().positive(),
});

/**
 * Delete party representative input (for backwards compatibility - now archives)
 */
export const deletePartyRepresentativeInput = archivePartyRepresentativeInput;

// ============================================================================
// CLAIM PARTY LINKING SCHEMAS
// ============================================================================

/**
 * Get claim parties
 */
export const getClaimPartiesInput = z.object({
	claimId: z.number().int().positive(),
});

/**
 * Link party to claim input
 * Note: liability_percentage is now on claim_party (moved from claim_liability)
 */
export const linkPartyToClaimInput = z.object({
	claim_id: z.number().int().positive(),
	party_id: z.number().int().positive(),
	role: z.string(),
	representative_id: z.number().int().positive().nullable().optional(),
	is_primary: z.boolean().optional(),
	liability_percentage: z.number().min(0).max(100).optional(),
	notes: z.string().max(2000).optional(),
	external_reference: z.string().max(255).optional(),
});

/**
 * Update claim party relationship input
 * Note: liability_percentage is now on claim_party (moved from claim_liability)
 */
export const updateClaimPartyInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		role: z.string().optional(),
		representative_id: z.number().int().positive().nullable().optional(),
		is_primary: z.boolean().optional(),
		liability_percentage: z.number().min(0).max(100).nullable().optional(),
		notes: z.string().max(2000).optional(),
		external_reference: z.string().max(255).optional(),
	}),
});

/**
 * Unlink party from claim input
 */
export const unlinkPartyFromClaimInput = z.object({
	id: z.number().int().positive(),
});

// ============================================================================
// HELPER VALIDATORS
// ============================================================================

/**
 * Validate party_category based on party_type
 * Note: This now just validates that the category is a non-empty string.
 * The actual valid values are managed in the reference_option table.
 */
export function validatePartyCategoryForType(
	party_type: PartyType,
	party_category: string
): boolean {
	// Basic validation - category must be a non-empty string
	// The actual valid values are now database-driven (reference_option table)
	return typeof party_category === 'string' && party_category.length > 0;
}
