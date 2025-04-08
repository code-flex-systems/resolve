import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '../database/kysely';
import { DB } from '../database/types';

export default {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	getAnswerCount,
	modifyAnswer,
};

async function createAnswer(questionId: number, params: object) {
	try {
		let answerCount = (await getAnswerCount(questionId)) ?? 0;
		return await db
			.insertInto('answer')
			.values({
				question_id: questionId,
				a_order: answerCount + 1,
				a_text: params.a_text,
				a_type: params.a_type,
				a_desc: params.a_desc,
				a_freeform_lines: params.a_freeform_lines,
				a_freeform_placeholder: params.a_freeform_lines,
				calls_page_id: params.calls_page_id,
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

async function getAnswerCount(questionId: number) {
	try {
		let answerCountRecord = await db
			.selectFrom('answer')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('question_id', '=', questionId)
			.executeTakeFirst();
		return parseInt(answerCountRecord?.count?.toString() ?? '0');
	} catch (e) {
		console.error(e);
	}
}

async function modifyAnswer(answerId: number, params: object) {
	try {
		let updates: UpdateObjectExpression<DB, 'answer'> = {};
		if (params.a_order) updates.a_order = params.a_order;
		if (params.a_text) updates.a_text = params.a_text;
		if (params.a_type) updates.a_type = params.a_type;
		if (params.a_desc != null) updates.a_desc = params.a_desc;
		if (params.a_freeform_lines) updates.a_freeform_lines = params.a_freeform_lines;
		if (params.a_freeform_placeholder != null) updates.a_freeform_placeholder = params.a_freeform_lines;
		if (params.calls_page_id) updates.calls_page_id = params.calls_page_id;
		return await db
			.updateTable('answer')
			.set({
				...updates,
			})
			.where('id', '=', answerId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
