import { sql } from 'kysely';
import { db } from '../database/kysely';
import { Answer } from '../types/types';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '../database/types';
import { InsertExpression } from 'kysely/dist/cjs/parser/insert-values-parser';
import answerQueries from './answerQueries';

export default {
	createQuestion,
	deleteQuestion,
	getQuestion,
	getQuestions,
	modifyQuestion,
};

async function createQuestion(pageId: number, params: object) {
	try {
		let newQuestion: any;
		await db.transaction().execute(async (trx) => {
			try {
				newQuestion = await trx
					.insertInto('question')
					.values({
						page_id: pageId,
						q_text: params.q_text,
						q_type: params.q_type,
						q_desc: params.q_desc,
					})
					.returningAll()
					.executeTakeFirst();
				if (params.q_type === 'freeform') {
					await answerQueries.createAnswer(
						newQuestion.id,
						{
							a_text: 'New answer',
							a_type: 'freeform',
						},
						trx
					);
				}
			} catch (e) {
				console.error(e);
			}
		});
		return newQuestion;
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
		let results = await db
			.selectFrom('question as q')
			.leftJoin('answer as a', 'a.question_id', 'q.id')
			.leftJoin('doc as d1', 'd1.id', 'q.doc_id')
			.leftJoin('doc as d2', 'd2.id', 'a.doc_id')
			.selectAll('q')
			.select((eb) => [
				sql`array_agg(
                    jsonb_build_object(
                        'id', ${eb.ref('a.id')},
                        'a_desc', ${eb.ref('a.a_desc')},
                        'a_text', ${eb.ref('a.a_text')},
                        'a_order', ${eb.ref('a.a_order')},
                        'a_type', ${eb.ref('a.a_type')},
                        'a_freeform_lines', ${eb.ref('a.a_freeform_lines')},
                        'a_freeform_placeholder', ${eb.ref('a.a_freeform_placeholder')},
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
		results.forEach((q) => {
			if (q.answers[0]?.id == null) q.answers = [];
		});
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(questionId: number, params: object) {
	try {
		let updates: UpdateObjectExpression<DB, 'question'> = {};
		if (params.q_text) updates.q_text = params.q_text;
		if (params.q_type) updates.q_type = params.q_type;
		if (params.q_desc != null) updates.q_desc = params.q_desc;
		return await db
			.updateTable('question')
			.set({
				...updates,
			})
			.where('id', '=', questionId)
			.returningAll()
			.executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}
