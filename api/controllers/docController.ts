import docQueries from '../queries/docQueries';

export default {
	createDoc,
	deleteDoc,
	getDoc,
	getDocs,
};

async function createDoc(params: object) {
	try {
		let results = await docQueries.createDoc(params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteDoc(id: number) {
	try {
		await docQueries.deleteDoc(id);
	} catch (e) {
		console.error(e);
	}
}

async function getDoc(id: number) {
	try {
		let results = await docQueries.getDoc(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getDocs() {
	try {
		let results = await docQueries.getDocs();
		return results;
	} catch (e) {
		console.error(e);
	}
}
