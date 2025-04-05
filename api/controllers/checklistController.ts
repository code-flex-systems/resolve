import checklistQueries from '../queries/checklistQueries';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	modifyChecklist,
};

async function createChecklist(params: object) {
	try {
		let results = await checklistQueries.createChecklist(params);
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

async function getChecklists() {
	try {
		let results = await checklistQueries.getChecklists();
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
