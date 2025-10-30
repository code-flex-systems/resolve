import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Claim } from '@/types/types';
import { logAdminAction, logAdminActions, AdminAction, EntityName } from '@/api/utils/adminActionLogger';

export async function assignClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId, assignee }: { checklistId: number; claimId: number; assignee: string }
) {
	// Assign claim and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const assignment = await claimQueries.assignClaim({ ...ctx, db: trx }, checklistId, claimId, assignee);

		// Log checklist_claim assignment (this creates the relationship)
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: `${checklistId}-${claimId}`,
			entityName: EntityName.CHECKLIST_CLAIM,
			action: AdminAction.UPDATE,
			value: { checklistId, claimId, assignee },
		});

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
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	const results = await claimQueries.getClaim(ctx, checklistId, claimId);
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
 * @param input - array of claim objects
 */
export async function createClaims(ctx: ProtectedContext, { claims }: { claims: Omit<Claim, 'id'>[] }) {
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

		return newClaims;
	});

	return created;
}
