import { sql, Transaction } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { db } from '@/api/database/kysely';
import { DB } from '@/api/database/types';
import { Answer, Interval } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import { applyClientScope } from '../database/clientScoped';

/**
 * Insert a new question and bump the page version.
 *
 * @param ctx - request context
 * @param pageId - page that will contain the question
 * @param params - question fields
 * @returns newly created question
 */
export async function createQuestion(ctx: ProtectedContext, pageId: number, params: object) {
	let newQuestion: any;
	await db.transaction().execute(async (trx) => {
		await trx
			.updateTable('question')
			.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
			.where('page_id', '=', pageId)
			.where('position', '>=', params.position)
			.execute();
		newQuestion = await trx
			.insertInto('question')
			.values({
				page_id: pageId,
				text: params.text,
				type: params.type,
				description_text: params.description_text,
				position: params.position,
				client_id: ctx.session.user.client_id,
				created_by: ctx.session.user.id,
			})
			.returningAll()
			.executeTakeFirstOrThrow();
		await bumpPageVersion(ctx, pageId, trx);
	});
	return newQuestion;
}

/**
 * Duplicate a question and its answers, inserting it after existing ones.
 *
 * @param ctx - request context
 * @param pageId - target page id
 * @param questionId - question to copy
 * @returns new question
 */
export async function copyQuestion(ctx: ProtectedContext, pageId: number, questionId: number) {
	const maxPosition = await applyClientScope(
		db
			.selectFrom('question')
			.select(({ fn }) => fn.max('position').as('max_position'))
			.where('page_id', '=', pageId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();

	let newQuestion: any;
	await db.transaction().execute(async (trx) => {
		newQuestion = await trx
			.insertInto('question')
			.columns(['page_id', 'description_text', 'text', 'type', 'client_id', 'position', 'created_by'])
			.expression((eb) =>
				applyClientScope(
					eb
						.selectFrom('question')
						.select((eb) => [
							'page_id',
							'description_text',
							'text',
							'type',
							'client_id',
							eb
								.val(+maxPosition.max_position.toString() + 1)
								.$castTo<number>()
								.as('position'),
							eb.val(ctx.session.user.id).as('created_by'),
						])
						.where('id', '=', questionId),
					ctx.session.user.client_id
				)
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
				'client_id',
				'created_by',
			])
			.expression((eb) =>
				applyClientScope(
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
							eb.val(newQuestion.id).$castTo<number>().as('question_id'),
							'calls_instance_id',
							'client_id',
							eb.val(ctx.session.user.id).as('created_by'),
						])
						.where('id', 'in', eb.selectFrom('answer').select('id').where('question_id', '=', questionId)),
					ctx.session.user.client_id
				)
			)
			.returning('id')
			.execute();
		await bumpPageVersion(ctx, pageId, trx);
	});
	return newQuestion;
}

/**
 * Remove a question and bump the page version.
 *
 * @param ctx - request context
 * @param pageId - page containing the question
 * @param questionId - identifier of the question to delete
 */
export async function deleteQuestion(ctx: ProtectedContext, pageId: number, questionId: number) {
	await db.transaction().execute(async (trx) => {
		const { position } = await trx
			.deleteFrom('question')
			.where('id', '=', questionId)
			.returning('position')
			.executeTakeFirstOrThrow();
		await trx
			.updateTable('question')
			.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
			.where((eb) => eb.and([eb('page_id', '=', pageId), eb('position', '>', position)]))
			.execute();
		await bumpPageVersion(ctx, pageId, trx);
	});
}

/**
 * Fetch a question by id.
 *
 * @param ctx - request context
 * @param questionId - identifier of the question
 * @returns the question row
 */
export async function getQuestion(ctx: ProtectedContext, questionId: number) {
	return await applyClientScope(
		db.selectFrom('question').selectAll().where('id', '=', questionId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
}

/**
 * Count how many questions are on a page.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @returns number of questions
 */
export async function getQuestionCount(ctx: ProtectedContext, pageId: number) {
	const countRow = await applyClientScope(
		db
			.selectFrom('question')
			.select(({ fn }) => fn.countAll().as('count'))
			.where('page_id', '=', pageId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	return parseInt(countRow.count?.toString() ?? '0');
}

/**
 * Retrieve questions for a page including their answers.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @returns array of questions with answers
 */
export async function getQuestions(ctx: ProtectedContext, pageId: number) {
	// Pull questions with their aggregated answers for the given page
	const results = await applyClientScope(
		db
			.selectFrom('question')
			.leftJoin('answer', 'answer.question_id', 'question.id')
			.selectAll('question')
			.select((eb) => [
				sql`array_agg(
                    jsonb_build_object(
                        'id', ${eb.ref('answer.id')},
                        'description_text', ${eb.ref('answer.description_text')},
                        'text', ${eb.ref('answer.text')},
                        'description_text', ${eb.ref('answer.description_text')},
                        'description_image_url', ${eb.ref('answer.description_image_url')},
                        'position', ${eb.ref('answer.position')},
                        'grade', ${eb.ref('answer.grade')},
                        'additional_info_num_lines', ${eb.ref('answer.additional_info_num_lines')},
                        'additional_info_placeholder', ${eb.ref('answer.additional_info_placeholder')},
                        'has_additional_info', ${eb.ref('answer.has_additional_info')},
                        'calls_instance_id', ${eb.ref('answer.calls_instance_id')}
                    )
                ) filter (where ${eb.ref('answer.id')} is not null)`
					.$castTo<Answer[]>()
					.as('answers'),
			])
			.where('question.page_id', '=', pageId)
			.groupBy('question.id')
			.orderBy('question.position'),
		ctx.session.user.client_id,
		'question'
	).execute();
	return results;
}

/**
 * Produce aggregated answer statistics for each question on a page.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @param interval - optional date interval for responses
 * @returns array of stats objects
 */
export async function getQuestionStats(ctx: ProtectedContext, pageId: number, interval?: Interval<string>) {
	// Collect answer counts for each question over the specified interval
	const results = await applyClientScope(
		db
			.selectFrom('question')
			.innerJoin('answer', 'question.id', 'answer.question_id')
			.leftJoin('question_response_answer', 'answer.id', 'question_response_answer.answer_id')
			.leftJoin('question_response', 'question_response_answer.response_id', 'question_response.id')
			.select(({ eb, fn }) => [
				'question.text as question_text',
				'answer.question_id',
				'answer.id as answer_id',
				'answer.text as answer_text',
				fn
					.sum(eb.case().when('question_response.id', 'is', null).then(0).else(1).end())
					.$castTo<string>()
					.as('answer_count'),
			])
			.where((eb) => {
				const andClause = [eb('question.page_id', '=', pageId)];
				if (interval) {
					if (interval.from)
						andClause.push(eb('question_response.created_at', '>=', new Date(interval.from)));
					if (interval.to) andClause.push(eb('question_response.created_at', '<=', new Date(interval.to)));
				} else {
					andClause.push(
						eb('question_response.created_at', '>=', sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>())
					);
				}
				return eb.and(andClause);
			})
			.groupBy([
				'question.text',
				'answer.question_id',
				'answer.id',
				'answer.text',
				'question.position',
				'answer.position',
			])
			.orderBy(['question.position', 'answer.position']),
		ctx.session.user.client_id,
		'question'
	).execute();
	return results;
}

/**
 * Update a question's properties and optionally move it to another page.
 *
 * @param ctx - request context
 * @param pageId - current page id
 * @param questionId - question identifier
 * @param params - fields to update
 * @returns updated question
 */
export async function modifyQuestion(ctx: ProtectedContext, pageId: number, questionId: number, params: object) {
	const existingQuestion = await applyClientScope(
		db.selectFrom('question').select('position').where('id', '=', questionId),
		ctx.session.user.client_id
	).executeTakeFirstOrThrow();
	const updates: UpdateObjectExpression<DB, 'question'> = {};

	if (params.text) updates.text = params.text;
	if (params.type) updates.type = params.type;
	if (params.description_text != null) updates.description_text = params.description_text;
	if (params.page_id) updates.page_id = params.page_id;
	if (params.position && params.position !== existingQuestion.position) updates.position = params.position;

	let newQuestion: any;
	await db.transaction().execute(async (trx) => {
		if (updates.position) {
			if (updates.position < existingQuestion.position) {
				// Shift down: move questions [newPosition, currentPosition - 1] up by 1
				await trx
					.updateTable('question')
					.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
					.where('page_id', '=', pageId)
					.where('position', '>=', updates.position)
					.where('position', '<', existingQuestion.position)
					.execute();
			} else {
				// Shift up: move questions [currentPosition + 1, newPosition] down by 1
				await trx
					.updateTable('question')
					.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
					.where('page_id', '=', pageId)
					.where('position', '>', existingQuestion.position)
					.where('position', '<=', updates.position)
					.execute();
			}
		}

		newQuestion = await trx
			.updateTable('question')
			.set({
				...updates,
				updated_by: ctx.session.user.id,
				updated_at: sql`now()`,
			})
			.where('id', '=', questionId)
			.returningAll()
			.executeTakeFirstOrThrow();
		await bumpPageVersion(ctx, pageId, trx);
		if (params.page_id) await bumpPageVersion(ctx, params.page_id, trx);
	});
	return newQuestion;
}

// private methods

/**
 * Helper to increment a page's version inside an existing transaction.
 *
 * @param ctx - request context
 * @param pageId - page to bump
 * @param trx - transaction to run the update in
 */
async function bumpPageVersion(ctx: ProtectedContext, pageId: number, trx: Transaction<DB>) {
	await trx
		.updateTable('page')
		.set((eb) => ({
			version: sql`${eb.ref('version')} + 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('id', '=', pageId)
		.execute();
}
