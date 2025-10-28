import * as docQueries from '@/api/queries/docQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { DocParams } from '@/schemas/docSchemas';

/**
 * Insert a document.
 *
 * @param ctx - request context
 * @param input - document fields
 * @returns created document
 */
export async function createDoc(ctx: ProtectedContext, { params }: { params: DocParams }) {
        const results = await docQueries.createDoc(ctx, params);
        return results;
}

/**
 * Delete a document.
 *
 * @param ctx - request context
 * @param input - document id
 */
export async function deleteDoc(ctx: ProtectedContext, { id }: { id: number }) {
	await docQueries.deleteDoc(ctx, id);
}

/**
 * Fetch a document by id.
 *
 * @param ctx - request context
 * @param input - document id
 */
export async function getDoc(ctx: ProtectedContext, { id }: { id: number }) {
	const results = await docQueries.getDoc(ctx, id);
	return results;
}

/**
 * Retrieve all documents.
 *
 * @param ctx - request context
 * @returns array of documents
 */
export async function getDocs(ctx: ProtectedContext) {
	const results = await docQueries.getDocs(ctx);
	return results;
}
