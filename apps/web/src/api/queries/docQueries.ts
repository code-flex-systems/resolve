import { db } from '@/api/database/kysely';

export async function createDoc(params: object) {
	return await db
		.insertInto('doc')
		.values({
			...params,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function deleteDoc(docId: number) {
	await db.deleteFrom('doc').where('id', '=', docId).execute();
}

export async function getDoc(docId: number) {
	return await db.selectFrom('doc').selectAll().where('id', '=', docId).executeTakeFirstOrThrow();
}

export async function getDocs() {
	return await db.selectFrom('doc').selectAll().orderBy('id').execute();
}
