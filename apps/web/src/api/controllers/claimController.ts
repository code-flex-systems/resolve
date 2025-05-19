import * as claimQueries from '@/api/queries/claimQueries';
import { ClaimSearch } from '@/config/enums';

export async function getClaim({ checklistId, claimId }: { checklistId: number; claimId: number }) {
	let results = await claimQueries.getClaim(checklistId, claimId);
	return results;
}

export async function getClaims({ searchTerm }: { searchTerm?: { value: string; type: ClaimSearch } }) {
	let results = await claimQueries.getClaims(searchTerm);
	return results;
}
