import * as docQueries from '@/api/queries/docQueries';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function createDoc(ctx: ProtectedContext, { params }: { params: object }) {
	let results = await docQueries.createDoc(ctx, params);
	return results;
}

export async function deleteDoc(ctx: ProtectedContext, { id }: { id: number }) {
	await docQueries.deleteDoc(ctx, id);
}

export async function getDoc(ctx: ProtectedContext, { id }: { id: number }) {
	let results = await docQueries.getDoc(ctx, id);
	return results;
}

export async function getDocs(ctx: ProtectedContext) {
	let results = await docQueries.getDocs(ctx);
	return results;
}
