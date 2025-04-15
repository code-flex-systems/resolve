import { sql } from 'kysely';
import { db } from '../database/kysely';
import { Answer } from '../types/types';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '../database/types';
import answerQueries from './answerQueries';

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
		let newQuestion: any;
		await db.transaction().execute(async (trx) => {
			try {
				newQuestion = await trx
					.insertInto('question')
					.values({
						page_id: pageId,
						text: params.text,
						type: params.type,
						description_text: params.description_text,
					})
					.returningAll()
					.executeTakeFirst();
			} catch (e) {
				console.error(e);
			}
		});
		return newQuestion;
	} catch (e) {
		console.error(e);
	}
}

async function copyQuestion(pageId: number, questionId: number) {
	try {
		let newQuestion: any;
		await db.transaction().execute(async (trx) => {
			try {
				newQuestion = await trx
					.insertInto('question')
					.columns(['page_id', 'description_text', 'text', 'type'])
					.expression((eb) =>
						eb
							.selectFrom('question')
							.select(['page_id', 'description_text', 'text', 'type'])
							.where('id', '=', questionId)
					)
					.returningAll()
					.executeTakeFirstOrThrow(() => new Error('Question does not exist'));
				await trx
					.insertInto('answer')
					.columns([
						'additional_info_num_lines',
						'additional_info_placeholder',
						'position',
						'text',
						'description_text',
						'description_image_url',
						'has_additional_info',
						'question_id',
						'calls_instance_id',
					])
					.expression((eb) =>
						eb
							.selectFrom('answer')
							.select((eb) => [
								'additional_info_num_lines',
								'additional_info_placeholder',
								'position',
								'text',
								'description_text',
								'description_image_url',
								'has_additional_info',
								eb.val(newQuestion.id).as('question_id'),
								'calls_instance_id',
							])
							.where(
								'id',
								'in',
								eb.selectFrom('answer').select('id').where('question_id', '=', questionId)
							)
					)
					.returning('id')
					.execute();
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
		return await db.selectFrom('question').selectAll().where('id', '=', questionId).executeTakeFirst();
	} catch (e) {
		console.error(e);
	}
}

async function getQuestions(pageId: number) {
	try {
		let results = await db
			.selectFrom('question as q')
			.leftJoin('answer as a', 'a.question_id', 'q.id')
			.selectAll('q')
			.select((eb) => [
				sql`array_agg(
                    jsonb_build_object(
                        'id', ${eb.ref('a.id')},
                        'description_text', ${eb.ref('a.description_text')},
                        'text', ${eb.ref('a.text')},
                        'description_text', ${eb.ref('a.description_text')},
                        'description_image_url', ${eb.ref('a.description_image_url')},
                        'position', ${eb.ref('a.position')},
                        'additional_info_num_lines', ${eb.ref('a.additional_info_num_lines')},
                        'additional_info_placeholder', ${eb.ref('a.additional_info_placeholder')},
                        'has_additional_info', ${eb.ref('a.has_additional_info')},
                        'calls_instance_id', ${eb.ref('a.calls_instance_id')}
                    )
                ) filter (where a.id is not null)`
					.$castTo<Answer[]>()
					.as('answers'),
			])
			.where('q.page_id', '=', pageId)
			.groupBy(['q.id'])
			.orderBy('id')
			.execute();
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(questionId: number, params: object) {
	try {
		let updates: UpdateObjectExpression<DB, 'question'> = {};
		if (params.text) updates.text = params.text;
		if (params.type) updates.type = params.type;
		if (params.description_text != null) updates.description_text = params.description_text;
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
