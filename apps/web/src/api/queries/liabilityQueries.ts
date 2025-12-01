import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';

// ============================================================================
// CLAIM LIABILITY CRUD OPERATIONS
// ============================================================================

/**
 * Get all liabilities for a specific claim_party (excludes soft-deleted)
 */
export async function getClaimPartyLiabilities(ctx: ProtectedContext, claimPartyId: number) {
	return await ctx.db
		.selectFrom('claim_liability')
		.selectAll()
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_liability.claim_party_id', '=', claimPartyId)
		.where('claim_liability.deleted_at', 'is', null)
		.orderBy('claim_liability.created_at asc')
		.execute();
}

/**
 * Get all liabilities for a claim across all parties (excludes soft-deleted)
 * Includes party information joined from claim_party
 */
export async function getClaimLiabilities(ctx: ProtectedContext, claimId: number) {
	return await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.selectAll('claim_liability')
		.select([
			'claim_party.claim_id',
			'claim_party.party_id',
			'claim_party.role',
		])
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim_liability.deleted_at', 'is', null)
		.orderBy('claim_party.id asc')
		.orderBy('claim_liability.created_at asc')
		.execute();
}

/**
 * Get single liability by ID (excludes soft-deleted)
 */
export async function getClaimLiability(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('claim_liability')
		.selectAll()
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_liability.id', '=', id)
		.where('claim_liability.deleted_at', 'is', null)
		.executeTakeFirst();
}

/**
 * Calculate aggregated liability totals for a claim (excludes soft-deleted)
 * Returns sums of liability percentages, coverage amounts, and recovery totals
 */
export async function getClaimLiabilityAggregates(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.select(({ fn }) => [
			fn.sum<string>('claim_liability.liability_percentage').as('total_liability_percentage'),
			fn.sum<string>('claim_liability.coverage_amount').as('total_coverage_amount'),
			fn.sum<string>('claim_liability.paid_recovery').as('total_paid_recovery'),
			fn.sum<string>('claim_liability.reserved_recovery').as('total_reserved_recovery'),
			fn.count<string>('claim_liability.id').as('liability_count'),
		])
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim_liability.deleted_at', 'is', null)
		.executeTakeFirst();

	return {
		total_liability_percentage: result?.total_liability_percentage ? parseFloat(result.total_liability_percentage) : 0,
		total_coverage_amount: result?.total_coverage_amount ? parseFloat(result.total_coverage_amount) : 0,
		total_paid_recovery: result?.total_paid_recovery ? parseFloat(result.total_paid_recovery) : 0,
		total_reserved_recovery: result?.total_reserved_recovery ? parseFloat(result.total_reserved_recovery) : 0,
		liability_count: result?.liability_count ? parseInt(result.liability_count) : 0,
	};
}

/**
 * Calculate paid and reserved recovery totals for a claim (excludes soft-deleted)
 * Replaces the paid_recovery and reserved_recovery fields that were removed from the claim table
 */
export async function getClaimRecoveryTotals(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.select(({ fn }) => [
			fn.sum<string>('claim_liability.paid_recovery').as('paid_recovery'),
			fn.sum<string>('claim_liability.reserved_recovery').as('reserved_recovery'),
		])
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim_liability.deleted_at', 'is', null)
		.executeTakeFirst();

	return {
		paid_recovery: result?.paid_recovery ? parseFloat(result.paid_recovery) : 0,
		reserved_recovery: result?.reserved_recovery ? parseFloat(result.reserved_recovery) : 0,
	};
}

/**
 * Create new liability for a claim_party
 * Automatically sets manually_overridden to false and derives client_id
 */
export async function createClaimLiability(
	ctx: ProtectedContext,
	params: {
		claim_party_id: number;
		liability_percentage?: number;
		coverage_amount?: number;
		line_of_business?: string;
		loss_type?: string;
		paid_recovery?: number;
		reserved_recovery?: number;
		notes?: string;
		feed_id?: number;
		external_reference?: string;
	}
) {
	// Derive client_id from claim_party
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select('claim.client_id')
		.where('claim_party.id', '=', params.claim_party_id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!claimParty) {
		throw new Error('Claim party not found or access denied');
	}

	return await ctx.db
		.insertInto('claim_liability')
		.values({
			claim_party_id: params.claim_party_id,
			client_id: claimParty.client_id,
			liability_percentage: params.liability_percentage?.toString(),
			coverage_amount: params.coverage_amount?.toString(),
			line_of_business: params.line_of_business,
			loss_type: params.loss_type,
			paid_recovery: params.paid_recovery?.toString(),
			reserved_recovery: params.reserved_recovery?.toString(),
			notes: params.notes,
			feed_id: params.feed_id,
			external_reference: params.external_reference,
			manually_overridden: false,
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Update existing liability
 * Sets manually_overridden to true when user updates (not when feed updates)
 */
export async function updateClaimLiability(
	ctx: ProtectedContext,
	id: number,
	params: {
		liability_percentage?: number;
		coverage_amount?: number;
		line_of_business?: string;
		loss_type?: string;
		paid_recovery?: number;
		reserved_recovery?: number;
		notes?: string;
		feed_id?: number;
		external_reference?: string;
		last_synced_at?: Date;
		manually_overridden?: boolean;
	},
	options?: {
		fromFeed?: boolean; // If true, don't set manually_overridden to true
	}
) {
	return await ctx.db
		.updateTable('claim_liability')
		.set({
			...(params.liability_percentage !== undefined && {
				liability_percentage: params.liability_percentage?.toString()
			}),
			...(params.coverage_amount !== undefined && {
				coverage_amount: params.coverage_amount?.toString()
			}),
			...(params.line_of_business !== undefined && {
				line_of_business: params.line_of_business
			}),
			...(params.loss_type !== undefined && {
				loss_type: params.loss_type
			}),
			...(params.paid_recovery !== undefined && {
				paid_recovery: params.paid_recovery?.toString()
			}),
			...(params.reserved_recovery !== undefined && {
				reserved_recovery: params.reserved_recovery?.toString()
			}),
			...(params.notes !== undefined && {
				notes: params.notes
			}),
			...(params.feed_id !== undefined && {
				feed_id: params.feed_id
			}),
			...(params.external_reference !== undefined && {
				external_reference: params.external_reference
			}),
			...(params.last_synced_at !== undefined && {
				last_synced_at: params.last_synced_at
			}),
			...(params.manually_overridden !== undefined && {
				manually_overridden: params.manually_overridden
			}),
			// Set manually_overridden to true unless this is a feed update
			...(!options?.fromFeed && { manually_overridden: true }),
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('claim_liability.id', '=', id)
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Delete liability (soft delete)
 * Uses soft delete to preserve traceability
 */
export async function deleteClaimLiability(ctx: ProtectedContext, id: number) {
	const deleted = await ctx.db
		.updateTable('claim_liability')
		.set({
			deleted_at: new Date().toISOString(),
		})
		.where('claim_liability.id', '=', id)
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_liability.deleted_at', 'is', null) // Only delete if not already deleted
		.returningAll()
		.executeTakeFirst();

	if (!deleted) {
		throw new Error('Liability not found or already deleted');
	}

	return deleted;
}

/**
 * Get liability for logging before deletion
 */
export async function getClaimLiabilityForDeletion(ctx: ProtectedContext, id: number) {
	return await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.select([
			'claim_liability.id',
			'claim_liability.claim_party_id',
			'claim_liability.loss_type',
			'claim_liability.liability_percentage',
			'claim_party.claim_id',
		])
		.where('claim_liability.id', '=', id)
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Find liability by external reference (for feed upsert logic)
 */
export async function findClaimLiabilityByExternalRef(
	ctx: ProtectedContext,
	claimPartyId: number,
	externalReference: string
) {
	return await ctx.db
		.selectFrom('claim_liability')
		.selectAll()
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_liability.claim_party_id', '=', claimPartyId)
		.where('claim_liability.external_reference', '=', externalReference)
		.executeTakeFirst();
}
