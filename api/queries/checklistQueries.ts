import { db } from '../database/kysely';

export default {
	createChecklist,
	deleteChecklist,
	getChecklist,
	getChecklists,
	modifyChecklist,
};

async function createChecklist(params: object) {
	try {
		return await db
			.insertInto('checklist')
			.values({
				...params,
			})
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function deleteChecklist(checklistId: number) {
	try {
		await db.deleteFrom('checklist').where('id', '=', checklistId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklist(checklistId: number) {
	try {
		return await db.selectFrom('checklist').selectAll().where('id', '=', checklistId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getChecklists() {
	try {
		return await db.selectFrom('checklist').selectAll().orderBy('id').execute();
	} catch (e) {
		console.error(e);
	}
}

async function modifyChecklist(checklistId: number, params: object) {
	try {
		return await db
			.updateTable('checklist')
			.set({
				...params,
			})
			.where('id', '=', checklistId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
