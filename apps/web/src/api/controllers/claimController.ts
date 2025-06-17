import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Claim } from '@/types/types';

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
 * Bulk insert claims.
 *
 * @param ctx - request context
 * @param input - array of claim objects
 */
export async function createClaims(ctx: ProtectedContext, { claims }: { claims: Omit<Claim, 'id'>[] }) {
	return await claimQueries.createClaims(ctx, claims);
}
