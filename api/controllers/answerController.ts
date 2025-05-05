import answerQueries from '../queries/answerQueries';

export default {
	createAnswer,
	copyAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	modifyAnswer,
};

async function createAnswer(pageId: number, questionId: number, params: object) {
	try {
		let results = await answerQueries.createAnswer(pageId, questionId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function copyAnswer(pageId: number, questionId: number, answerId: number) {
	try {
		let existingAnswer = await answerQueries.getAnswer(answerId);
		if (!existingAnswer) throw new Error('Answer does not exist');
		let results = await answerQueries.createAnswer(pageId, questionId, existingAnswer);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteAnswer(pageId: number, answerId: number) {
	try {
		await answerQueries.deleteAnswer(pageId, answerId);
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

async function modifyAnswer(pageId: number, answerId: number, params: object) {
	try {
		let results = await answerQueries.modifyAnswer(pageId, answerId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
