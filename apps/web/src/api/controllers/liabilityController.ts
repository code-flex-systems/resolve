import type { ProtectedContext } from '@/server/trpc/trpc';
import * as liabilityQueries from '@/api/queries/liabilityQueries';
import { logAction, EntityName, LogAction } from '@/api/utils/activityLogger';

// ============================================================================
// CLAIM LIABILITY CONTROLLERS
// ============================================================================

/**
 * Get all liabilities for a specific claim_party
 */
export async function getClaimPartyLiabilities(
	ctx: ProtectedContext,
	{ claimPartyId }: { claimPartyId: number }
) {
	return await liabilityQueries.getClaimPartyLiabilities(ctx, claimPartyId);
}

/**
 * Get all liabilities for a claim
 */
export async function getClaimLiabilities(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await liabilityQueries.getClaimLiabilities(ctx, claimId);
}

/**
 * Get single liability by ID
 */
export async function getClaimLiability(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	return await liabilityQueries.getClaimLiability(ctx, id);
}

/**
 * Get aggregated liability totals for a claim
 */
export async function getClaimLiabilityAggregates(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await liabilityQueries.getClaimLiabilityAggregates(ctx, claimId);
}

/**
 * Get total amount paid for a claim (sum of claim_liability.amount_paid)
 */
export async function getClaimAmountPaidTotal(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await liabilityQueries.getClaimAmountPaidTotal(ctx, claimId);
}

/**
 * Create claim liability with activity logging
 * Note: liability_percentage is now on claim_party, not claim_liability
 * Note: amount_paid replaces paid_recovery; reserved_recovery removed
 * @returns liability, expectedRecovery, and claimId
 */
export async function createClaimLiability(
	ctx: ProtectedContext,
	input: {
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
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { liability, expectedRecovery, claimId } = await liabilityQueries.createClaimLiability({ ...ctx, db: trx }, input);

		if (claimId) {
			await logAction({ ...ctx, db: trx }, {
				entityId: liability.id,
				entityName: EntityName.CLAIM_LIABILITY,
				action: LogAction.CREATE,
				value: {
					coverage_amount: liability.coverage_amount,
					loss_type: liability.loss_type,
					line_of_business: liability.line_of_business,
					amount_paid: liability.amount_paid,
				},
			});
		}

		return { liability, expectedRecovery, claimId };
	});

	return result;
}

/**
 * Update claim liability with activity logging
 * Note: liability_percentage is now on claim_party, not claim_liability
 * Note: amount_paid replaces paid_recovery; reserved_recovery removed
 * @returns liability, expectedRecovery, and claimId
 */
export async function updateClaimLiability(
	ctx: ProtectedContext,
	{
		id,
		params,
		fromFeed,
	}: {
		id: number;
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
		};
		fromFeed?: boolean;
	}
) {
	const result = await ctx.db.transaction().execute(async (trx) => {
		const { liability, expectedRecovery, claimId } = await liabilityQueries.updateClaimLiability(
			{ ...ctx, db: trx },
			id,
			params,
			{ fromFeed }
		);

		// Only log if this is a user update (not feed update)
		if (!fromFeed && claimId) {
			await logAction({ ...ctx, db: trx }, {
				entityId: liability.id,
				entityName: EntityName.CLAIM_LIABILITY,
				action: LogAction.UPDATE,
				value: params,
			});
		}

		return { liability, expectedRecovery, claimId };
	});

	return result;
}

/**
 * Delete claim liability with activity logging
 * @returns liability, expectedRecovery, and claimId
 */
export async function deleteClaimLiability(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const result = await ctx.db.transaction().execute(async (trx) => {
		// Get liability details for logging before deletion
		const liabilityForLog = await liabilityQueries.getClaimLiabilityForDeletion({ ...ctx, db: trx }, id);

		if (!liabilityForLog) {
			throw new Error('Liability not found or access denied');
		}

		// Delete the liability
		const { liability, expectedRecovery, claimId } = await liabilityQueries.deleteClaimLiability({ ...ctx, db: trx }, id);

		// Log the deletion
		await logAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.CLAIM_LIABILITY,
			action: LogAction.DELETE,
			value: {
				loss_type: liabilityForLog.loss_type,
			},
		});

		return { liability, expectedRecovery, claimId };
	});

	return result;
}
