import { sql } from 'kysely';
import { db } from '../database/kysely';
import { Answer } from '../types/types';

export default {
	createQuestion,
	deleteQuestion,
	getQuestion,
	getQuestions,
	modifyQuestion,
};

async function createQuestion(pageId: number, params: object) {
	try {
		return await db
			.insertInto('question')
			.values({
				page_id: pageId,
				...params,
			})
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function deleteQuestion(questionId: number) {
	try {
		await db.deleteFrom('question').where('id', '=', questionId).execute();
	} catch (e) {
		console.error(e);
	}
}

async function getQuestion(questionId: number) {
	try {
		return await db
			.selectFrom('question as q')
			.leftJoin('doc as d', 'd.id', 'q.doc_id')
			.selectAll('q')
			.select(['d.filename', 'd.alias'])
			.where('q.id', '=', questionId)
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getQuestions(pageId: number) {
	try {
		return await db
			.selectFrom('question as q')
			.leftJoin('answer as a', 'a.question_id', 'q.id')
			.leftJoin('doc as d1', 'd1.id', 'q.doc_id')
			.leftJoin('doc as d2', 'd2.id', 'a.doc_id')
			.selectAll('q')
			.select((eb) => [
				sql`array_agg(
                    jsonb_build_object(
                        'id', ${eb.ref('a.id')},
                        'a_text', ${eb.ref('a.a_text')},
                        'a_order', ${eb.ref('a.a_order')},
                        'a_type', ${eb.ref('a.a_type')},
                        'calls_page_id', ${eb.ref('a.calls_page_id')},
                        'doc_id', ${eb.ref('a.doc_id')},
                        'filename', ${eb.ref('d2.filename')},
				        'alias', ${eb.ref('d2.alias')}
                    )
                )`
					.$castTo<Answer[]>()
					.as('answers'),
				'd1.filename as q_filename',
				'd1.alias as q_alias',
			])
			.where('q.page_id', '=', pageId)
			.groupBy(['q.doc_id', 'q.id', 'q.page_id', 'q.q_desc', 'q.q_text', 'q.q_type', 'd1.filename', 'd1.alias'])
			.orderBy('id')
			.execute();
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(questionId: number, params: object) {
	try {
		return await db
			.updateTable('question')
			.set({
				...params,
			})
			.where('id', '=', questionId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
