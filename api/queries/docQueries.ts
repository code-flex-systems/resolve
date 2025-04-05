import { db } from '../database/kysely';

export default {
	createDoc,
	deleteDoc,
	getDoc,
	getDocs,
};

async function createDoc(params: object) {
	try {
		return await db
			.insertInto('doc')
			.values({
				...params,
			})
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function deleteDoc(docId: number) {
	try {
		await db.deleteFrom('doc').where('id', '=', docId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getDoc(docId: number) {
	try {
		return await db.selectFrom('doc').selectAll().where('id', '=', docId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getDocs() {
	try {
		return await db.selectFrom('doc').selectAll().orderBy('id').execute();
	} catch (e) {
		console.error(e);
	}
}
