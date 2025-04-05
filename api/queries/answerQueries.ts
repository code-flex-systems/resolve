import { db } from '../database/kysely';

export default {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	modifyAnswer,
};

async function createAnswer(questionId: number, params: object) {
	try {
		return await db
			.insertInto('answer')
			.values({
				question_id: questionId,
				...params,
			})
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function deleteAnswer(answerId: number) {
	try {
		await db.deleteFrom('answer').where('id', '=', answerId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getAnswer(answerId: number) {
	try {
		return await db
			.selectFrom('answer as a')
			.leftJoin('doc as d', 'd.id', 'a.doc_id')
			.selectAll('a')
			.select(['d.filename', 'd.alias'])
			.where('a.id', '=', answerId)
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getAnswers(questionId: number) {
	try {
		return await db
			.selectFrom('answer as a')
			.leftJoin('doc as d', 'd.id', 'a.doc_id')
			.selectAll('a')
			.select(['d.filename', 'd.alias'])
			.where('a.question_id', '=', questionId)
			.orderBy('a.a_order')
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function modifyAnswer(answerId: number, params: object) {
	try {
		return await db
			.updateTable('answer')
			.set({
				...params,
			})
			.where('id', '=', answerId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
