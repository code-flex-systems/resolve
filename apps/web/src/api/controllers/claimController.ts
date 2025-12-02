import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Claim } from '@/types/types';
import { logAdminAction, logAdminActions, AdminAction, EntityName } from '@/api/utils/adminActionLogger';
import type { CreateClaimInput, ClaimData } from '@/schemas/claimSchemas';

export async function assignClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId, assignee }: { checklistId: number; claimId: number; assignee: string }
) {
	// Assign claim and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const assignment = await claimQueries.assignClaim({ ...ctx, db: trx }, checklistId, claimId, assignee);

		// Log checklist_claim assignment (this creates the relationship)
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: `${checklistId}-${claimId}`,
				entityName: EntityName.CHECKLIST_CLAIM,
				action: AdminAction.UPDATE,
				value: { checklistId, claimId, assignee },
			}
		);

		return assignment;
	});

	return results;
}

/**
 * Retrieve a claim and mark it as recently opened.
 *
 * @param ctx - request context
 * @param input - checklist and claim ids
 */
export async function getClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { claimId: number; checklistId?: number }
) {
	const results = await claimQueries.getClaim(ctx, claimId, checklistId);
	return results;
}

export async function getNextClaimToAssign(
	ctx: ProtectedContext,
	{ feedId, offset }: { feedId: number; offset?: number }
) {
	const results = await claimQueries.getNextClaimToAssign(ctx, feedId, offset);
	return results;
}

/**
 * Retrieve claims with optional feed or search filters.
 *
 * @param ctx - request context
 * @param params - filtering and pagination options
 */
export async function getClaims(
	ctx: ProtectedContext,
	params: {
		feedId?: number | null;
		searchTerm?: { value: string; type: ClaimSearch };
		line_of_business?: string;
		loss_type?: string;
		limit?: number;
		offset?: number;
	}
) {
	const [rows, count] = await Promise.all([
		claimQueries.getClaims(ctx, { ...params, type: 'data' }),
		claimQueries.getClaims(ctx, { ...params, type: 'count' }),
	]);
	return { rows, count };
}

/**
 * Count claims.
 *
 * @param ctx - request context
 */
export async function getClaimCount(ctx: ProtectedContext, { clientId }: { clientId: string }) {
	const results = await claimQueries.getClaimCount(ctx, clientId);
	return results;
}

export async function getRolloverClaimCount(ctx: ProtectedContext) {
	const results = await claimQueries.getRolloverClaimCount(ctx);
	return results;
}

/**
 * Bulk insert claims.
 *
 * @param ctx - request context
 * @param input - array of claim objects and optional party/representative linking
 */
export async function createClaims(
	ctx: ProtectedContext,
	{
		claims,
		party_id,
		representative_id,
		role,
	}: {
		claims: ClaimData[];
		party_id?: number | null;
		representative_id?: number | null;
		role?: string | null;
	}
) {
	// Create claims and log admin actions within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const newClaims = await claimQueries.createClaims({ ...ctx, db: trx }, claims);

		// Log admin actions for bulk claim creation
		await logAdminActions(
			{ ...ctx, db: trx },
			newClaims.map((claim) => ({
				entityId: claim.id,
				entityName: EntityName.CLAIM,
				action: AdminAction.CREATE,
				value: { claim_number: claim.claim_number, insured: claim.insured, claim_amount: claim.claim_amount },
			}))
		);

		// Link party to claims if party_id and role provided
		if (party_id && role && newClaims.length > 0) {
			const { linkPartyToClaim } = await import('@/api/queries/partyQueries');

			for (const claim of newClaims) {
				await linkPartyToClaim(
					{ ...ctx, db: trx },
					{
						claim_id: claim.id!,
						party_id,
						role,
						is_primary: true,
						representative_id: representative_id ?? null,
					}
				);

				// Log party linking
				await logAdminAction(
					{ ...ctx, db: trx },
					{
						entityId: claim.id!,
						entityName: EntityName.CLAIM,
						action: AdminAction.UPDATE,
						value: { party_id, representative_id, action: 'linked_party' },
					}
				);
			}
		}

		return newClaims;
	});

	return created;
}

/**
 * Update an existing claim.
 *
 * @param ctx - request context
 * @param input - claim ID and fields to update
 */
export async function updateClaim(
	ctx: ProtectedContext,
	input: {
		claimId: number;
		claim_number?: string | null;
		client?: string | null;
		client_adjuster?: string | null;
		insured?: string | null;
		claim_amount?: number | null;
		total_incurred?: number | null;
		date_of_loss?: Date | null;
		loss_location?: string | null;
		expected_recovery?: number | null;
		line_of_business?: string;
		loss_type?: string;
		recovery_status?: string;
		substatus?: string;
		party_id?: number | null;
		representative_id?: number | null;
		role?: string | null;
	}
) {
	const {
		claimId,
		claim_amount,
		total_incurred,
		expected_recovery,
		party_id,
		representative_id,
		role,
		...otherUpdates
	} = input;

	// Convert number amounts to strings for DB storage
	const updates = {
		...otherUpdates,
		...(claim_amount !== undefined && { claim_amount: claim_amount?.toString() ?? null }),
		...(total_incurred !== undefined && { total_incurred: total_incurred?.toString() ?? null }),
		...(expected_recovery !== undefined && { expected_recovery: expected_recovery?.toString() ?? null }),
	};

	// Update claim and log admin action within transaction
	const updated = await ctx.db.transaction().execute(async (trx) => {
		const updatedClaim = await claimQueries.updateClaim({ ...ctx, db: trx }, claimId, updates);

		if (!updatedClaim) {
			throw new Error('Claim not found or you do not have permission to update it');
		}

		// Log admin action for claim update
		await logAdminAction(
			{ ...ctx, db: trx },
			{
				entityId: claimId,
				entityName: EntityName.CLAIM,
				action: AdminAction.UPDATE,
				value: { claim_number: updatedClaim.claim_number, ...updates },
			}
		);

		// Handle party linking/unlinking/updating if party_id is provided in the input
		if (party_id !== undefined) {
			const {
				getClaimParties,
				linkPartyToClaim,
				unlinkPartyFromClaim,
				updateClaimParty,
			} = await import('@/api/queries/partyQueries');

			// Get existing party relationships for this claim
			const existingParties = await getClaimParties({ ...ctx, db: trx }, claimId);
			// Find the primary party relationship (regardless of role)
			const existingPrimary = existingParties.find((p) => p.is_primary);

			if (party_id === null) {
				// User wants to remove party - unlink the primary party
				if (existingPrimary) {
					await unlinkPartyFromClaim({ ...ctx, db: trx }, existingPrimary.id);
					await logAdminAction(
						{ ...ctx, db: trx },
						{
							entityId: claimId,
							entityName: EntityName.CLAIM,
							action: AdminAction.UPDATE,
							value: { action: 'unlinked_party', party_id: existingPrimary.party_id },
						}
					);
				}
			} else if (role) {
				// User wants to set/update party (role is required for creating/updating)
				const partyChanged = !existingPrimary || existingPrimary.party_id !== party_id;
				const repChanged = !existingPrimary || existingPrimary.representative_id !== representative_id;
				const roleChanged = !existingPrimary || existingPrimary.role !== role;

				if (existingPrimary) {
					// Update existing primary party
					if (partyChanged || roleChanged) {
						// Party or role changed - delete old and create new
						await unlinkPartyFromClaim({ ...ctx, db: trx }, existingPrimary.id);
						await linkPartyToClaim(
							{ ...ctx, db: trx },
							{
								claim_id: claimId,
								party_id,
								role,
								is_primary: true,
								representative_id: representative_id ?? null,
							}
						);
						await logAdminAction(
							{ ...ctx, db: trx },
							{
								entityId: claimId,
								entityName: EntityName.CLAIM,
								action: AdminAction.UPDATE,
								value: {
									action: 'replaced_party',
									old_party_id: existingPrimary.party_id,
									new_party_id: party_id,
									representative_id,
									role,
								},
							}
						);
					} else if (repChanged) {
						// Only representative changed - update existing record
						await updateClaimParty({ ...ctx, db: trx }, existingPrimary.id, {
							representative_id: representative_id ?? null,
						});
						await logAdminAction(
							{ ...ctx, db: trx },
							{
								entityId: claimId,
								entityName: EntityName.CLAIM,
								action: AdminAction.UPDATE,
								value: { action: 'updated_representative', representative_id },
							}
						);
					}
					// If both party and rep are same, no action needed
				} else {
					// No existing primary party - create new one
					await linkPartyToClaim(
						{ ...ctx, db: trx },
						{
							claim_id: claimId,
							party_id,
							role,
							is_primary: true,
							representative_id: representative_id ?? null,
						}
					);
					await logAdminAction(
						{ ...ctx, db: trx },
						{
							entityId: claimId,
							entityName: EntityName.CLAIM,
							action: AdminAction.UPDATE,
							value: { action: 'linked_party', party_id, representative_id, role },
						}
					);
				}
			}
		}

		return updatedClaim;
	});

	return updated;
}

/**
 * Get detailed claim information for admin panel.
 *
 * @param ctx - request context
 * @param input - claim id
 */
export async function getClaimDetail(ctx: ProtectedContext, { claimId }: { claimId: number }) {
	const results = await claimQueries.getClaimDetail(ctx, claimId);
	return results;
}

/**
 * Get all claims assigned to the current user with filters, pagination, and metrics
 *
 * @param ctx - request context
 * @param input - filter and pagination options
 */
export async function listMyClaims(
	ctx: ProtectedContext,
	input: {
		searchTerm?: string;
		claimStatus?: import('@/config/enums').ClaimStatus;
		recoveryStatus?: import('@/config/enums').RecoveryStatus;
		substatus?: string;
		line_of_business?: string;
		loss_type?: string;
		limit?: number;
		offset?: number;
		sortField?: string;
		sortOrder?: 'asc' | 'desc';
	}
) {
	const results = await claimQueries.listMyClaims(ctx, input);
	return results;
}

/**
 * Get claims assigned to the user's desk locations
 * Used for desk hierarchy feature
 */
export async function listMyDeskClaims(
	ctx: ProtectedContext,
	input: {
		searchTerm?: string;
		claimStatus?: import('@/config/enums').ClaimStatus;
		recoveryStatus?: import('@/config/enums').RecoveryStatus;
		limit?: number;
		offset?: number;
	}
) {
	const results = await claimQueries.listMyDeskClaims(ctx, input);
	return results;
}
