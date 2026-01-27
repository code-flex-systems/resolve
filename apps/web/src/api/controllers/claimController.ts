import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Claim } from '@/types/types';
import { logAdminAction, logAdminActions, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';
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
	const { rows, count } = await claimQueries.getClaims(ctx, params);
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
 * @param input - array of claim objects
 */
export async function createClaims(
	ctx: ProtectedContext,
	{ claims }: { claims: ClaimData[] }
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
				value: { claim_number: claim.claim_number, insured: claim.insured },
			}))
		);

		return newClaims;
	});

	return created;
}

/**
 * Update an existing claim.
 * Note: loss_type is no longer on the claim table - it's set per claim_liability
 * Note: All amount fields are now calculated, not stored directly on the claim
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
		date_of_loss?: Date | null;
		loss_street_address?: string | null;
		loss_city?: string | null;
		loss_state?: string | null;
		loss_postal_code?: string | null;
		loss_country?: string | null;
		recovery_status?: string;
		substatus?: string;
	}
) {
	const { claimId, ...updates } = input;

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
