import * as docQueries from '@/api/queries/docQueries';

export async function createDoc({ params }: { params: object }) {
	let results = await docQueries.createDoc(params);
	return results;
}

export async function deleteDoc({ id }: { id: number }) {
	await docQueries.deleteDoc(id);
}

export async function getDoc({ id }: { id: number }) {
	let results = await docQueries.getDoc(id);
	return results;
}

export async function getDocs() {
	let results = await docQueries.getDocs();
	return results;
}
