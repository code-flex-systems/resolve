import { db } from '@/api/database/kysely';
import { Doc } from '@/api/database/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

/**
 * Insert a document into the database.
 *
 * @param ctx - request context
 * @param params - document fields
 * @returns created document
 */
export async function createDoc(
        ctx: ProtectedContext,
        params: object
) {
	return await db
		.insertInto('doc')
		.values({
			...params,
			client_id: ctx.session.user.client_id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();
}

/**
 * Remove a document record.
 *
 * @param ctx - request context
 * @param docId - document identifier
 */
export async function deleteDoc(
        ctx: ProtectedContext,
        docId: number
) {
	await db.deleteFrom('doc').where('id', '=', docId).execute();
}

/**
 * Fetch a document by id.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns the found document
 */
export async function getDoc(
        ctx: ProtectedContext,
        docId: number
) {
	return await applyClientScope(
		db.selectFrom('doc').selectAll().where('id', '=', docId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

/**
 * Retrieve all documents for the current client.
 *
 * @param ctx - request context
 * @returns array of documents
 */
export async function getDocs(ctx: ProtectedContext) {
        return await applyClientScope(
                db.selectFrom('doc').selectAll().orderBy('id'),
                ctx.session.user.client_id
        ).execute();
}
