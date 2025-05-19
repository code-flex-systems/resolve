import * as checklistQueries from '@/api/queries/checklistQueries';
import { SummarySegment } from '@/config/enums';

export async function createChecklist({ claimId, params }: { claimId: number; params: object }) {
	let results = await checklistQueries.createChecklist(claimId, params);
	return results;
}

export async function deleteChecklist({ id }: { id: number }) {
	await checklistQueries.deleteChecklist(id);
}

export async function getChecklist({ id }: { id: number }) {
	let results = await checklistQueries.getChecklist(id);
	return results;
}

export async function getChecklists({ searchTerm }: { searchTerm?: string }) {
	let results = await checklistQueries.getChecklists(searchTerm);
	return results;
}

export async function getChecklistClaim({ checklistId, claimId }: { checklistId: number; claimId: number }) {
	let results = await checklistQueries.getChecklistClaim(checklistId, claimId);
	return results;
}

export async function getChecklistSummary({ checklistId, claimId }: { checklistId: number; claimId: number }) {
	let results = await checklistQueries.getChecklistSummary(checklistId, claimId);
	return results;
}

export async function getChecklistSummaryDetail(input: {
	checklistId: number;
	claimId: number;
	segment: SummarySegment;
	limit?: number;
	offset?: number;
}) {
	const [data = [], count = 0] = await Promise.all([
		checklistQueries.getChecklistSummaryDetail({ ...input, mode: 'rows' }),
		checklistQueries.getChecklistSummaryDetail({ ...input, mode: 'count' }),
	]);
	return { rows: data, count: count };
}

export async function getRecentChecklistClaims() {
	let results = await checklistQueries.getRecentChecklistClaims();
	return results;
}

export async function modifyChecklist({ id, params }: { id: number; params: object }) {
	let results = await checklistQueries.modifyChecklist(id, params);
	return results;
}
