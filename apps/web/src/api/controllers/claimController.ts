import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { ProtectedContext } from '@/server/trpc/trpc';
import { Claim } from '@/types/types';

export async function getClaim(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	let results = await claimQueries.getClaim(ctx, checklistId, claimId);
	return results;
}

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

export async function createClaims(ctx: ProtectedContext, { claims }: { claims: Omit<Claim, 'id'>[] }) {
	return await claimQueries.createClaims(ctx, claims);
}
