import type { ProtectedContext } from '@/server/trpc/trpc';
import { sql } from 'kysely';
import { recalculateClaimExpectedRecovery } from './claimQueries';

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
 * Returns sums of coverage amounts and amount_paid
 * Note: liability_percentage is now on claim_party, not claim_liability
 */
export async function getClaimLiabilityAggregates(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.select(({ fn }) => [
			fn.sum<string>('claim_liability.coverage_amount').as('total_coverage_amount'),
			fn.sum<string>('claim_liability.amount_paid').as('total_amount_paid'),
			fn.count<string>('claim_liability.id').as('liability_count'),
		])
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim_liability.deleted_at', 'is', null)
		.executeTakeFirst();

	return {
		total_coverage_amount: result?.total_coverage_amount ? parseFloat(result.total_coverage_amount) : 0,
		total_amount_paid: result?.total_amount_paid ? parseFloat(result.total_amount_paid) : 0,
		liability_count: result?.liability_count ? parseInt(result.liability_count) : 0,
	};
}

/**
 * Calculate total amount paid across all liabilities for a claim (excludes soft-deleted)
 * Note: Reserved amounts are now tracked on claim_coverage, not claim_liability
 */
export async function getClaimAmountPaidTotal(ctx: ProtectedContext, claimId: number) {
	const result = await ctx.db
		.selectFrom('claim_liability')
		.innerJoin('claim_party', 'claim_party.id', 'claim_liability.claim_party_id')
		.select(({ fn }) => [
			fn.sum<string>('claim_liability.amount_paid').as('total_amount_paid'),
		])
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_party.claim_id', '=', claimId)
		.where('claim_party.deleted_at', 'is', null)
		.where('claim_liability.deleted_at', 'is', null)
		.executeTakeFirst();

	return result?.total_amount_paid ? parseFloat(result.total_amount_paid) : 0;
}

/**
 * Create new liability for a claim_party
 * Automatically sets manually_overridden to false and derives client_id
 * Recalculates expected_recovery after creation
 * Note: liability_percentage is now on claim_party, not claim_liability
 *
 * @returns liability and updated expectedRecovery
 */
export async function createClaimLiability(
	ctx: ProtectedContext,
	params: {
		claim_party_id: number;
		coverage_amount?: number;
		line_of_business?: string;
		loss_type?: string;
		amount_paid?: number;
		notes?: string;
		feed_id?: number;
		external_reference?: string;
	}
) {
	// Derive client_id and claim_id from claim_party
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.innerJoin('claim', 'claim.id', 'claim_party.claim_id')
		.select(['claim.client_id', 'claim_party.claim_id'])
		.where('claim_party.id', '=', params.claim_party_id)
		.where('claim.client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();

	if (!claimParty) {
		throw new Error('Claim party not found or access denied');
	}

	const liability = await ctx.db
		.insertInto('claim_liability')
		.values({
			claim_party_id: params.claim_party_id,
			client_id: claimParty.client_id,
			coverage_amount: params.coverage_amount?.toString(),
			line_of_business: params.line_of_business,
			loss_type: params.loss_type,
			amount_paid: params.amount_paid?.toString(),
			notes: params.notes,
			feed_id: params.feed_id,
			external_reference: params.external_reference,
			manually_overridden: false,
			created_by: ctx.session.user.id,
			created_at: sql`now()`,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	// Recalculate expected_recovery and return the new value
	const expectedRecovery = await recalculateClaimExpectedRecovery(ctx, claimParty.claim_id);

	return { liability, expectedRecovery, claimId: claimParty.claim_id };
}

/**
 * Update existing liability
 * Sets manually_overridden to true when user updates (not when feed updates)
 * Recalculates expected_recovery after update
 * Note: liability_percentage is now on claim_party, not claim_liability
 *
 * @returns liability and updated expectedRecovery
 */
export async function updateClaimLiability(
	ctx: ProtectedContext,
	id: number,
	params: {
		coverage_amount?: number;
		line_of_business?: string;
		loss_type?: string;
		amount_paid?: number;
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
	const liability = await ctx.db
		.updateTable('claim_liability')
		.set({
			...(params.coverage_amount !== undefined && {
				coverage_amount: params.coverage_amount?.toString()
			}),
			...(params.line_of_business !== undefined && {
				line_of_business: params.line_of_business
			}),
			...(params.loss_type !== undefined && {
				loss_type: params.loss_type
			}),
			...(params.amount_paid !== undefined && {
				amount_paid: params.amount_paid?.toString()
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

	// Get claim_id from claim_party
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.select(['claim_id'])
		.where('id', '=', liability.claim_party_id)
		.executeTakeFirst();

	// Recalculate expected_recovery and return the new value
	const expectedRecovery = claimParty
		? await recalculateClaimExpectedRecovery(ctx, claimParty.claim_id)
		: 0;

	return { liability, expectedRecovery, claimId: claimParty?.claim_id };
}

/**
 * Delete liability (soft delete)
 * Uses soft delete to preserve traceability
 * Recalculates expected_recovery after deletion
 *
 * @returns deleted liability and updated expectedRecovery
 */
export async function deleteClaimLiability(ctx: ProtectedContext, id: number) {
	const liability = await ctx.db
		.updateTable('claim_liability')
		.set({
			deleted_at: new Date().toISOString(),
		})
		.where('claim_liability.id', '=', id)
		.where('claim_liability.client_id', '=', ctx.session.user.client_id)
		.where('claim_liability.deleted_at', 'is', null) // Only delete if not already deleted
		.returningAll()
		.executeTakeFirst();

	if (!liability) {
		throw new Error('Liability not found or already deleted');
	}

	// Get claim_id from claim_party
	const claimParty = await ctx.db
		.selectFrom('claim_party')
		.select(['claim_id'])
		.where('id', '=', liability.claim_party_id)
		.executeTakeFirst();

	// Recalculate expected_recovery and return the new value
	const expectedRecovery = claimParty
		? await recalculateClaimExpectedRecovery(ctx, claimParty.claim_id)
		: 0;

	return { liability, expectedRecovery, claimId: claimParty?.claim_id };
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

/**
 * Archive all liabilities for a claim_party (soft delete)
 * Used when archiving an entity or facilitator from a claim.
 * Similar to archiveCoveragesByClaimParty in coverageQueries.ts.
 */
export async function archiveLiabilitiesByClaimParty(ctx: ProtectedContext, claimPartyId: number) {
	await ctx.db
		.updateTable('claim_liability')
		.set({
			deleted_at: new Date(),
			deleted_by: ctx.session.user.id,
		})
		.where('claim_party_id', '=', claimPartyId)
		.where('client_id', '=', ctx.session.user.client_id)
		.where('deleted_at', 'is', null)
		.execute();
}
