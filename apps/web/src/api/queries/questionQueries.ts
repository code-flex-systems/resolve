import { sql } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '@/api/database/types';
import { Answer, DateRangeStrict } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { QuestionParams, QuestionUpdateParams } from '@/schemas/questionSchemas';
import { QuestionType } from '@/config/enums';

/**
 * Insert a new question and bump the page version.
 *
 * @param ctx - request context
 * @param pageId - page that will contain the question
 * @param params - question fields
 * @returns newly created question
 */
export async function createQuestion(ctx: ProtectedContext, pageId: number, params: QuestionParams) {
	await ctx.db
		.updateTable('question')
		.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
		.where('page_id', '=', pageId)
		.where('position', '>=', params.position)
		.execute();

	const newQuestion = await ctx.db
		.insertInto('question')
		.values({
			page_id: pageId,
			text: params.text,
			type: params.type,
			description_text: params.description_text,
			description_image_url: params.description_image_url,
			placeholder: params.placeholder,
			hidden: params.hidden ?? undefined,
			position: params.position,
			client_id: ctx.session.user.client_id,
			created_by: ctx.session.user.id,
		})
		.returningAll()
		.executeTakeFirstOrThrow();

	await bumpPageVersion(ctx, pageId);

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
	const maxPosition = await ctx.db
		.selectFrom('question')
		.select(({ fn }) => fn.max('position').as('max_position'))
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('page_id', '=', pageId)
		.executeTakeFirstOrThrow();

	const newQuestion = await ctx.db
		.insertInto('question')
		.columns([
			'page_id',
			'description_text',
			'description_image_url',
			'text',
			'type',
			'placeholder',
			'hidden',
			'client_id',
			'position',
			'created_by',
		])
		.expression((eb) =>
			eb
				.selectFrom('question')
				.select((eb) => [
					'page_id',
					'description_text',
					'description_image_url',
					'text',
					'type',
					'placeholder',
					'hidden',
					'client_id',
					eb
						.val(+maxPosition.max_position.toString() + 1)
						.$castTo<number>()
						.as('position'),
					eb.val(ctx.session.user.id).as('created_by'),
				])
				.where('question.client_id', '=', ctx.session.user.client_id)
				.where('id', '=', questionId)
		)
		.returningAll()
		.executeTakeFirstOrThrow(() => new Error('Question does not exist'));

	await ctx.db
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
			'hidden',
			'question_id',
			'calls_instance_id',
			'client_id',
			'created_by',
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
					'hidden',
					eb.val(newQuestion.id).$castTo<number>().as('question_id'),
					'calls_instance_id',
					'client_id',
					eb.val(ctx.session.user.id).as('created_by'),
				])
				.where('answer.client_id', '=', ctx.session.user.client_id)
				.where(
					'id',
					'in',
					eb
						.selectFrom('answer')
						.select('id')
						.where('question_id', '=', questionId)
						.where('answer.client_id', '=', ctx.session.user.client_id)
				)
		)
		.returning('id')
		.execute();

	await bumpPageVersion(ctx, pageId);

	return newQuestion;
}

/**
 * Fetch a question for logging before deletion.
 *
 * @param ctx - request context
 * @param questionId - question identifier
 * @returns the question details
 */
export async function getQuestionForDeletion(ctx: ProtectedContext, questionId: number) {
	return await ctx.db
		.selectFrom('question')
		.select(['id', 'page_id', 'text', 'type'])
		.where('id', '=', questionId)
		.where('client_id', '=', ctx.session.user.client_id)
		.executeTakeFirst();
}

/**
 * Remove a question and bump the page version.
 *
 * @param ctx - request context
 * @param pageId - page containing the question
 * @param questionId - identifier of the question to delete
 */
export async function deleteQuestion(ctx: ProtectedContext, pageId: number, questionId: number) {
	const { position } = await ctx.db
		.deleteFrom('question')
		.where('id', '=', questionId)
		.returning('position')
		.executeTakeFirstOrThrow();

	await ctx.db
		.updateTable('question')
		.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
		.where((eb) => eb.and([eb('page_id', '=', pageId), eb('position', '>', position)]))
		.execute();

	await bumpPageVersion(ctx, pageId);
}

/**
 * Fetch a question by id.
 *
 * @param ctx - request context
 * @param questionId - identifier of the question
 * @returns the question row
 */
export async function getQuestion(ctx: ProtectedContext, questionId: number) {
	return await ctx.db
		.selectFrom('question')
		.selectAll()
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', questionId)
		.executeTakeFirstOrThrow();
}

/**
 * Count how many questions are on a page.
 *
 * @param ctx - request context
 * @param pageId - page identifier
 * @returns number of questions
 */
export async function getQuestionCount(ctx: ProtectedContext, pageId: number) {
	const countRow = await ctx.db
		.selectFrom('question')
		.select(({ fn }) => fn.countAll().as('count'))
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('page_id', '=', pageId)
		.executeTakeFirstOrThrow();
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
	const results = await ctx.db
		.selectFrom('question')
		.leftJoin('answer', 'answer.question_id', 'question.id')
		.leftJoin('action', (join) =>
			join.onRef('action.answer_id', '=', 'answer.id').on('action.client_id', '=', ctx.session.user.client_id)
		)
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
                        'calls_instance_id', ${eb.ref('answer.calls_instance_id')},
                        'has_action', ${eb.case().when('action.id', 'is', null).then(false).else(true).end()}
                    ) ORDER BY ${eb.ref('answer.position')}
                ) filter (where ${eb.ref('answer.id')} is not null)`
				.$castTo<Answer[]>()
				.as('answers'),
		])
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('question.page_id', '=', pageId)
		.groupBy('question.id')
		.orderBy('question.position')
		.execute();
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
export async function getQuestionStats(
	ctx: ProtectedContext,
	pageId: number,
	filters: { claimId?: number; range: DateRangeStrict; users?: string[] }
) {
	// Collect answer counts for each question over the specified interval
	const results = await ctx.db
		.selectFrom('question')
		.innerJoin('answer', 'question.id', 'answer.question_id')
		.leftJoin('question_response_answer', 'answer.id', 'question_response_answer.answer_id')
		.leftJoin('question_response', (join) => {
			// Start with the basic join condition
			let joinBuilder = join.onRef('question_response_answer.response_id', '=', 'question_response.id');

			// Apply claim filter to the join
			if (filters.claimId) {
				joinBuilder = joinBuilder.on('question_response.claim_id', '=', filters.claimId);
			}

			// Apply user filter to the join
			if (filters.users?.length) {
				joinBuilder = joinBuilder.on('question_response.created_by', 'in', filters.users);
			}

			// Apply date range filter to the join
			if (filters.range && filters.range.some((d) => !!d)) {
				if (filters.range[0]) {
					joinBuilder = joinBuilder.on('question_response.created_at', '>=', filters.range[0]);
				}
				if (filters.range[1]) {
					joinBuilder = joinBuilder.on('question_response.created_at', '<=', filters.range[1]);
				}
			} else {
				// Default to last 30 days if no range provided
				joinBuilder = joinBuilder.on(
					'question_response.created_at',
					'>=',
					sql`CURRENT_DATE - INTERVAL '30 days'`.$castTo<Date>()
				);
			}

			return joinBuilder;
		})
		.select(({ fn }) => [
			'question.text as question_text',
			'answer.question_id',
			'answer.id as answer_id',
			'answer.text as answer_text',
			fn.count('question_response.id').$castTo<string>().as('answer_count'),
		])
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('question.page_id', '=', pageId)
		.groupBy([
			'question.text',
			'answer.question_id',
			'answer.id',
			'answer.text',
			'question.position',
			'answer.position',
		])
		.orderBy(['question.position', 'answer.position'])
		.execute();
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
export async function modifyQuestion(
	ctx: ProtectedContext,
	pageId: number,
	questionId: number,
	params: QuestionUpdateParams
) {
	const existingQuestion = await ctx.db
		.selectFrom('question')
		.select(['position', 'type'])
		.where('question.client_id', '=', ctx.session.user.client_id)
		.where('id', '=', questionId)
		.executeTakeFirstOrThrow();
	const updates: UpdateObjectExpression<DB, 'question'> = {};

	if (params.text) updates.text = params.text;
	if (params.type) updates.type = params.type;
	if (params.description_text != null) updates.description_text = params.description_text;
	if (params.description_image_url !== undefined) updates.description_image_url = params.description_image_url;
	if (params.placeholder !== undefined) updates.placeholder = params.placeholder;
	if (params.hidden !== undefined) updates.hidden = params.hidden;
	if (params.page_id) updates.page_id = params.page_id;
	if (params.position && params.position !== existingQuestion.position) updates.position = params.position;

	// Check if converting to free-form
	const convertingToFreeform =
		params.type === QuestionType.FREEFORM && existingQuestion.type !== QuestionType.FREEFORM;

	// Delete all existing answers when converting to free-form
	if (convertingToFreeform) {
		await ctx.db.deleteFrom('answer').where('question_id', '=', questionId).execute();
	}

	if (updates.position) {
		if (updates.position < existingQuestion.position) {
			// Shift down: move questions [newPosition, currentPosition - 1] up by 1
			await ctx.db
				.updateTable('question')
				.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
				.where('page_id', '=', pageId)
				.where('position', '>=', updates.position)
				.where('position', '<', existingQuestion.position)
				.execute();
		} else {
			// Shift up: move questions [currentPosition + 1, newPosition] down by 1
			await ctx.db
				.updateTable('question')
				.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
				.where('page_id', '=', pageId)
				.where('position', '>', existingQuestion.position)
				.where('position', '<=', updates.position)
				.execute();
		}
	}

	const newQuestion = await ctx.db
		.updateTable('question')
		.set({
			...updates,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', questionId)
		.returningAll()
		.executeTakeFirstOrThrow();

	await bumpPageVersion(ctx, pageId);
	if (params.page_id) await bumpPageVersion(ctx, params.page_id);

	return newQuestion;
}

// private methods

/**
 * Helper to increment a page's version.
 *
 * @param ctx - request context
 * @param pageId - page to bump
 */
async function bumpPageVersion(ctx: ProtectedContext, pageId: number) {
	await ctx.db
		.updateTable('page')
		.set((eb) => ({
			version: sql`${eb.ref('version')} + 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('id', '=', pageId)
		.execute();
}
