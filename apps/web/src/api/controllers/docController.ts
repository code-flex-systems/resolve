import * as docQueries from '@/api/queries/docQueries';
import { ProtectedContext } from '@/server/trpc/trpc';

/**
 * Insert a document.
 *
 * @param ctx - request context
 * @param input - document fields
 * @returns created document
 */
export async function createDoc(ctx: ProtectedContext, { params }: { params: object }) {
	let results = await docQueries.createDoc(ctx, params);
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
	let results = await docQueries.getDoc(ctx, id);
	return results;
}

/**
 * Retrieve all documents.
 *
 * @param ctx - request context
 * @returns array of documents
 */
export async function getDocs(ctx: ProtectedContext) {
	let results = await docQueries.getDocs(ctx);
	return results;
}
