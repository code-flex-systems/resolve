import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';
import { Claim } from '@/types/types';

export async function getClaim({ checklistId, claimId }: { checklistId: number; claimId: number }) {
	let results = await claimQueries.getClaim(checklistId, claimId);
	return results;
}

export async function getClaims({
	feedId,
	searchTerm,
	limit,
	offset,
}: {
	feedId?: number | null;
	searchTerm?: { value: string; type: ClaimSearch };
	limit?: number;
	offset?: number;
}) {
	const [rows, count] = await Promise.all([
		claimQueries.getClaims('data', feedId, searchTerm, limit, offset),
		claimQueries.getClaims('count', feedId, searchTerm, limit, offset),
	]);
	return { rows, count };
}

export async function createClaims({ claims }: { claims: Omit<Claim, 'id'>[] }) {
	return await claimQueries.createClaims(claims);
}
