import { z } from 'zod';

// ============================================================================
// CLAIM LIABILITY SCHEMAS
// ============================================================================

/**
 * Get all liabilities for a specific claim_party
 */
export const getClaimPartyLiabilitiesInput = z.object({
	claimPartyId: z.number().int().positive(),
});

/**
 * Get all liabilities for a claim
 */
export const getClaimLiabilitiesInput = z.object({
	claimId: z.number().int().positive(),
});

/**
 * Get single liability by ID
 */
export const getClaimLiabilityInput = z.object({
	id: z.number().int().positive(),
});

/**
 * Get aggregated liability totals for a claim
 */
export const getClaimLiabilityAggregatesInput = z.object({
	claimId: z.number().int().positive(),
});

/**
 * Get recovery totals for a claim
 */
export const getClaimRecoveryTotalsInput = z.object({
	claimId: z.number().int().positive(),
});

/**
 * Create claim liability input
 */
export const createClaimLiabilityInput = z.object({
	claim_party_id: z.number().int().positive(),
	liability_percentage: z.number().min(0).max(100).optional(),
	coverage_amount: z.number().min(0).optional(),
	line_of_business: z.string().optional(),
	loss_type: z.string().optional(),
	paid_recovery: z.number().min(0).optional(),
	reserved_recovery: z.number().min(0).optional(),
	notes: z.string().max(2000).optional(),
	// Feed integration fields (admin/feed use only)
	feed_id: z.number().int().positive().optional(),
	external_reference: z.string().max(255).optional(),
});

/**
 * Update claim liability input
 */
export const updateClaimLiabilityInput = z.object({
	id: z.number().int().positive(),
	params: z.object({
		liability_percentage: z.number().min(0).max(100).optional(),
		coverage_amount: z.number().min(0).optional(),
		line_of_business: z.string().optional(),
		loss_type: z.string().optional(),
		paid_recovery: z.number().min(0).optional(),
		reserved_recovery: z.number().min(0).optional(),
		notes: z.string().max(2000).optional(),
		// Feed integration fields (admin/feed use only)
		feed_id: z.number().int().positive().optional(),
		external_reference: z.string().max(255).optional(),
		last_synced_at: z.date().optional(),
		manually_overridden: z.boolean().optional(),
	}),
	// Optional flag to indicate this is a feed update (won't set manually_overridden=true)
	fromFeed: z.boolean().optional(),
});

/**
 * Delete claim liability input
 */
export const deleteClaimLiabilityInput = z.object({
	id: z.number().int().positive(),
});
