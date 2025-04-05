import answerQueries from '../queries/answerQueries';

export default {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	modifyAnswer,
};

async function createAnswer(questionId: number, params: object) {
	try {
		let results = await answerQueries.createAnswer(questionId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteAnswer(id: number) {
	try {
		await answerQueries.deleteAnswer(id);
	} catch (e) {
		console.error(e);
	}
}

async function getAnswer(id: number) {
	try {
		let results = await answerQueries.getAnswer(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getAnswers(questionId: number) {
	try {
		let results = await answerQueries.getAnswers(questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyAnswer(id: number, params: object) {
	try {
		let results = await answerQueries.modifyAnswer(id, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
