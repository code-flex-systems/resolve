import { SummarySegment } from '../config/enums';
import checklistQueries from '../queries/checklistQueries';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	getChecklistClaim,
	getRecentChecklistClaims,
	getChecklistSummary,
	getChecklistSummaryDetail,
	modifyChecklist,
};

async function createChecklist(claimId: number, params: object) {
	try {
		let results = await checklistQueries.createChecklist(claimId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteChecklist(id: number) {
	try {
		await checklistQueries.deleteChecklist(id);
	} catch (e) {
		console.error(e);
	}
}

async function getChecklist(id: number) {
	try {
		let results = await checklistQueries.getChecklist(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getChecklists(searchTerm?: string) {
	try {
		let results = await checklistQueries.getChecklists(searchTerm);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistClaim(checklistId: number, claimId: number) {
	try {
		let results = await checklistQueries.getChecklistClaim(checklistId, claimId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistSummary(checklistId: number, claimId: number) {
	try {
		let results = await checklistQueries.getChecklistSummary(checklistId, claimId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getChecklistSummaryDetail(params: {
	checklistId: number;
	claimId: number;
	segment: SummarySegment;
	limit?: number;
	offset?: number;
}) {
	try {
		const [data, count] = await Promise.all([
			checklistQueries.getChecklistSummaryDetail({ ...params, mode: 'rows' }),
			checklistQueries.getChecklistSummaryDetail({ ...params, mode: 'count' }),
		]);
		return { rows: data ?? [], count: count ?? 0 };
	} catch (e) {
		console.error(e);
	}
}

async function getRecentChecklistClaims() {
	try {
		let results = await checklistQueries.getRecentChecklistClaims();
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyChecklist(id: number, params: object) {
	try {
		let results = await checklistQueries.modifyChecklist(id, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
