import checklistQueries from '../queries/checklistQueries';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	getChecklistClaim,
	getRecentChecklistClaims,
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
