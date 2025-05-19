import * as answerQueries from '@/api/queries/answerQueries';

export async function createAnswer({
	pageId,
	questionId,
	params,
}: {
	pageId: number;
	questionId: number;
	params: object;
}) {
	let results = await answerQueries.createAnswer(pageId, questionId, params);
	return results;
}

export async function copyAnswer({
	pageId,
	questionId,
	answerId,
}: {
	pageId: number;
	questionId: number;
	answerId: number;
}) {
	try {
		let existingAnswer = await answerQueries.getAnswer(answerId);
		if (!existingAnswer) throw new Error('Answer does not exist');
		let results = await answerQueries.createAnswer(pageId, questionId, existingAnswer);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function deleteAnswer({ pageId, answerId }: { pageId: number; answerId: number }) {
	try {
		await answerQueries.deleteAnswer(pageId, answerId);
	} catch (e) {
		console.error(e);
	}
}

export async function getAnswer({ id }: { id: number }) {
	try {
		let results = await answerQueries.getAnswer(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function getAnswers({ questionId }: { questionId: number }) {
	try {
		let results = await answerQueries.getAnswers(questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function modifyAnswer({ pageId, answerId, params }: { pageId: number; answerId: number; params: object }) {
	try {
		let results = await answerQueries.modifyAnswer(pageId, answerId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
