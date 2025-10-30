import { ProtectedContext } from '@/server/trpc/trpc';
import type { DocParams } from '@/schemas/docSchemas';

/**
 * Insert a document into the database.
 *
 * @param ctx - request context
 * @param params - document fields
 * @returns created document
 */
export async function createDoc(ctx: ProtectedContext, params: DocParams) {
        return await ctx.db
                .insertInto('doc')
                .values({
                        alias: params.alias,
                        filename: params.filename,
                        client_id: ctx.session.user.client_id,
                        created_by: ctx.session.user.id,
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
export async function deleteDoc(ctx: ProtectedContext, docId: number) {
	await ctx.db.deleteFrom('doc').where('id', '=', docId).execute();
}

/**
 * Fetch a document by id.
 *
 * @param ctx - request context
 * @param docId - document identifier
 * @returns the found document
 */
export async function getDoc(ctx: ProtectedContext, docId: number) {
        return await ctx.db
                .selectFrom('doc')
                .selectAll()
                .where('doc.client_id', '=', ctx.session.user.client_id)
                .where('id', '=', docId)
                .executeTakeFirstOrThrow();
}

/**
 * Retrieve all documents for the current client.
 *
 * @param ctx - request context
 * @returns array of documents
 */
export async function getDocs(ctx: ProtectedContext) {
        return await ctx.db
                .selectFrom('doc')
                .selectAll()
                .where('doc.client_id', '=', ctx.session.user.client_id)
                .orderBy('id')
                .execute();
}
