import claimQueries from '../queries/claimQueries';
import { ClaimSearchType } from '../types/types';

export default {
	getClaim,
	getClaims,
};

async function getClaim(checklistId: number, claimId: number) {
	try {
		let results = await claimQueries.getClaim(checklistId, claimId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getClaims(searchTerm?: { value: string; type: ClaimSearchType }) {
	try {
		let results = await claimQueries.getClaims(searchTerm);
		return results;
	} catch (e) {
		console.error(e);
	}
}
