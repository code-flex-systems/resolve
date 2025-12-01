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
 * Get recovery totals for a claim (replaces claim.paid_recovery and claim.reserved_recovery)
 */
export async function getClaimRecoveryTotals(
	ctx: ProtectedContext,
	{ claimId }: { claimId: number }
) {
	return await liabilityQueries.getClaimRecoveryTotals(ctx, claimId);
}

/**
 * Create claim liability with activity logging
 */
export async function createClaimLiability(
	ctx: ProtectedContext,
	input: {
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
	const created = await ctx.db.transaction().execute(async (trx) => {
		const liability = await liabilityQueries.createClaimLiability({ ...ctx, db: trx }, input);

		// Get claim_id for activity logging
		const claimParty = await trx
			.selectFrom('claim_party')
			.select('claim_id')
			.where('id', '=', input.claim_party_id)
			.executeTakeFirst();

		if (claimParty) {
			await logAction({ ...ctx, db: trx }, {
				entityId: liability.id,
				entityName: EntityName.CLAIM_LIABILITY,
				action: LogAction.CREATE,
				value: {
					liability_percentage: liability.liability_percentage,
					coverage_amount: liability.coverage_amount,
					loss_type: liability.loss_type,
					line_of_business: liability.line_of_business,
				},
			});
		}

		return liability;
	});

	return created;
}

/**
 * Update claim liability with activity logging
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
		};
		fromFeed?: boolean;
	}
) {
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const liability = await liabilityQueries.updateClaimLiability(
			{ ...ctx, db: trx },
			id,
			params,
			{ fromFeed }
		);

		// Only log if this is a user update (not feed update)
		if (!fromFeed) {
			// Get claim_id for activity logging
			const claimParty = await trx
				.selectFrom('claim_party')
				.select('claim_id')
				.where('id', '=', liability.claim_party_id)
				.executeTakeFirst();

			if (claimParty) {
				await logAction({ ...ctx, db: trx }, {
					entityId: liability.id,
					entityName: EntityName.CLAIM_LIABILITY,
					action: LogAction.UPDATE,
					value: params,
				});
			}
		}

		return liability;
	});

	return updated;
}

/**
 * Delete claim liability with activity logging
 */
export async function deleteClaimLiability(
	ctx: ProtectedContext,
	{ id }: { id: number }
) {
	const deleted = await ctx.db.transaction().execute(async (trx) => {
		// Get liability details for logging before deletion
		const liabilityForLog = await liabilityQueries.getClaimLiabilityForDeletion({ ...ctx, db: trx }, id);

		if (!liabilityForLog) {
			throw new Error('Liability not found or access denied');
		}

		// Delete the liability
		const liability = await liabilityQueries.deleteClaimLiability({ ...ctx, db: trx }, id);

		// Log the deletion
		await logAction({ ...ctx, db: trx }, {
			entityId: id,
			entityName: EntityName.CLAIM_LIABILITY,
			action: LogAction.DELETE,
			value: {
				loss_type: liabilityForLog.loss_type,
				liability_percentage: liabilityForLog.liability_percentage,
			},
		});

		return liability;
	});

	return deleted;
}
