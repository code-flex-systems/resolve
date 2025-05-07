import { sql, Transaction } from 'kysely';
import { db } from '../database/kysely';
import { Answer, Interval } from '../types/types';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '../database/types';

export default {
	createQuestion,
	copyQuestion,
	deleteQuestion,
	getQuestion,
	getQuestionCount,
	getQuestions,
	getQuestionStats,
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
						position: params.position,
					})
					.returningAll()
					.executeTakeFirst();
				await bumpPageVersion(pageId, trx);
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
		let maxPosition = await db
			.selectFrom('question')
			.select(({ fn }) => fn.max('position').as('max_position'))
			.where('page_id', '=', pageId)
			.executeTakeFirstOrThrow();
		await db.transaction().execute(async (trx) => {
			try {
				newQuestion = await trx
					.insertInto('question')
					.columns(['page_id', 'description_text', 'text', 'type', 'position'])
					.expression((eb) =>
						eb
							.selectFrom('question')
							.select((eb) => [
								'page_id',
								'description_text',
								'text',
								'type',
								eb.val(+maxPosition.max_position.toString() + 1).as('position'),
							])
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
						'grade',
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
								'grade',
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
				await bumpPageVersion(pageId, trx);
			} catch (e) {
				console.error(e);
			}
		});
		return newQuestion;
	} catch (e) {
		console.error(e);
	}
}

async function deleteQuestion(pageId: number, questionId: number) {
	try {
		await db.transaction().execute(async (trx) => {
			await trx.deleteFrom('question').where('id', '=', questionId).execute();
			await bumpPageVersion(pageId, trx);
		});
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

async function getQuestionCount(pageId: number) {
	try {
		const countRow = await db
			.selectFrom('question')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('page_id', '=', pageId)
			.executeTakeFirst();
		return parseInt(countRow?.count?.toString() ?? '0');
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
                        'grade', ${eb.ref('a.grade')},
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

async function getQuestionStats(pageId: number, interval?: Interval<string>) {
	try {
		let results = await db
			.selectFrom('question as q')
			.innerJoin('answer as a', 'q.id', 'a.question_id')
			.leftJoin('question_response_answer as qra', 'a.id', 'qra.answer_id')
			.leftJoin('question_response as qr', 'qra.response_id', 'qr.id')
			.select(({ eb, fn }) => [
				'q.text as question_text',
				'a.question_id',
				'a.id as answer_id',
				'a.text as answer_text',
				fn.sum(eb.case().when('qr.id', 'is', null).then(0).else(1).end()).$castTo<string>().as('answer_count'),
			])
			.where((eb) => {
				let andClause = [eb('q.page_id', '=', pageId)];
				if (interval) {
					if (interval.from) andClause.push(eb('qr.created_at', '>=', new Date(interval.from)));
					if (interval.to) andClause.push(eb('qr.created_at', '<=', new Date(interval.to)));
				} else {
					andClause.push(eb('qr.created_at', '>=', sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>()));
				}
				return eb.and(andClause);
			})
			.groupBy(['q.text', 'a.question_id', 'a.id', 'a.text', 'q.position', 'a.position'])
			.orderBy(['q.position', 'a.position'])
			.execute();
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(pageId: number, questionId: number, params: object) {
	try {
		let updates: UpdateObjectExpression<DB, 'question'> = {};
		if (params.text) updates.text = params.text;
		if (params.type) updates.type = params.type;
		if (params.description_text != null) updates.description_text = params.description_text;
		if (params.page_id) updates.page_id = params.page_id;
		let newQuestion: any;
		await db.transaction().execute(async (trx) => {
			newQuestion = await trx
				.updateTable('question')
				.set({
					...updates,
				})
				.where('id', '=', questionId)
				.returningAll()
				.executeTakeFirst();
			await bumpPageVersion(pageId, trx);
			if (params.page_id) await bumpPageVersion(params.page_id, trx);
		});
		return newQuestion;
	} catch (e) {
		console.error(e);
	}
}

// private methods

async function bumpPageVersion(pageId: number, trx: Transaction<DB>) {
	try {
		await trx
			.updateTable('page')
			.set((eb) => ({ version: sql`${eb.ref('version')} + 1` }))
			.where('id', '=', pageId)
			.execute();
	} catch (e) {
		console.error(e);
	}
}
