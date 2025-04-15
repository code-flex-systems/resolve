import questionQueries from '../queries/questionQueries';

export default {
	createQuestion,
	copyQuestion,
	deleteQuestion,
	getQuestion,
	getQuestions,
	modifyQuestion,
};

async function createQuestion(pageId: number, params: object) {
	try {
		let results = await questionQueries.createQuestion(pageId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function copyQuestion(pageId: number, questionId: number) {
	try {
		let results = await questionQueries.copyQuestion(pageId, questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteQuestion(id: number) {
	try {
		await questionQueries.deleteQuestion(id);
	} catch (e) {
		console.error(e);
	}
}

async function getQuestion(id: number) {
	try {
		let results = await questionQueries.getQuestion(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getQuestions(pageId: number) {
	try {
		let results = await questionQueries.getQuestions(pageId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(id: number, params: object) {
	try {
		let results = await questionQueries.modifyQuestion(id, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
