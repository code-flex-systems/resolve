import { db } from '@/api/database/kysely';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

export async function createDoc(ctx: ProtectedContext, params: object) {
	return await db
		.insertInto('doc')
		.values({
			...params,
			client_id: ctx.session.user.client_id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

export async function deleteDoc(ctx: ProtectedContext, docId: number) {
	await db.deleteFrom('doc').where('id', '=', docId).execute();
}

export async function getDoc(ctx: ProtectedContext, docId: number) {
	return await applyClientScope(
		db.selectFrom('doc').selectAll().where('id', '=', docId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

export async function getDocs(ctx: ProtectedContext) {
	return await applyClientScope(db.selectFrom('doc').selectAll().orderBy('id'), ctx.session.user.client_id).execute();
}
