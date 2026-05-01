import { sql } from 'kysely';
import { UpdateObjectExpression } from 'kysely/dist/cjs/parser/update-set-parser';
import { DB } from '@/api/database/types';
import { Answer, DateRangeStrict } from '@/types/types';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { QuestionParams, QuestionUpdateParams } from '@/schemas/questionSchemas';
import { QuestionType } from '@/config/enums';
import { insertCallEdgesBulk } from './answerQueries';

/**
 * Insert a new question and bump the page version.
 *
 * @param ctx - request context
 * @param pageId - page that will contain the question
 * @param params - question fields
 * @returns newly created question
 */
export async function createQuestion(
	ctx: ProtectedContext,
	pageId: string,
	params: QuestionParams
) {
	await ctx.db
		.updateTable('question')
		.set((eb) => ({ position: sql`${eb.ref('position')} + 1` }))
		.where('client_id', '=', ctx.session.user.client_id)
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
			client_id: ctx.session.user.client_id!,
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
export async function copyQuestion(ctx: ProtectedContext, pageId: string, questionId: string) {
	// Insert with position computed inline via COALESCE subquery (single query)
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
				.selectFrom('question as source')
				.select([
					'source.page_id',
					'source.description_text',
					'source.description_image_url',
					'source.text',
					'source.type',
					'source.placeholder',
					'source.hidden',
					'source.client_id',
					sql<number>`COALESCE((
						SELECT MAX(position) FROM question
						WHERE client_id = ${ctx.session.user.client_id}
						AND page_id = ${pageId}
					), 0) + 1`.as('position'),
					eb.val(ctx.session.user.id).as('created_by'),
				])
				.where('source.client_id', '=', ctx.session.user.client_id)
				.where('source.id', '=', questionId)
		)
		.returningAll()
		.executeTakeFirstOrThrow(() => new Error('Question does not exist'));

	const copiedAnswers = await ctx.db
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
		.returning(['id', 'calls_instance_id'])
		.execute();

	// Bulk insert call edges for all copied answers that have calls_instance_id
	// Uses single INSERT...SELECT instead of N separate queries
	const answersWithCalls = copiedAnswers
		.filter((a): a is { id: string; calls_instance_id: string } => a.calls_instance_id !== null)
		.map((a) => ({ id: a.id, calls_instance_id: a.calls_instance_id }));

	if (answersWithCalls.length > 0) {
		await insertCallEdgesBulk(ctx, pageId, answersWithCalls);
	}

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
export async function getQuestionForDeletion(ctx: ProtectedContext, questionId: string) {
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
export async function deleteQuestion(ctx: ProtectedContext, pageId: string, questionId: string) {
	const { position } = await ctx.db
		.deleteFrom('question')
		.where('id', '=', questionId)
		.where('client_id', '=', ctx.session.user.client_id)
		.returning('position')
		.executeTakeFirstOrThrow();

	await ctx.db
		.updateTable('question')
		.set((eb) => ({ position: sql`${eb.ref('position')} - 1` }))
		.where('client_id', '=', ctx.session.user.client_id)
		.where('page_id', '=', pageId)
		.where('position', '>', position)
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
export async function getQuestion(ctx: ProtectedContext, questionId: string) {
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
export async function getQuestionCount(ctx: ProtectedContext, pageId: string) {
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
export async function getQuestions(ctx: ProtectedContext, pageId: string) {
	// Pull questions with their aggregated answers for the given page
	// Use EXISTS subquery for has_action instead of joining action table
	const results = await ctx.db
		.selectFrom('question')
		.leftJoin('answer', 'answer.question_id', 'question.id')
		.selectAll('question')
		.select((eb) => [
			sql`array_agg(
                    jsonb_build_object(
                        'id', ${eb.ref('answer.id')},
                        'description_text', ${eb.ref('answer.description_text')},
                        'text', ${eb.ref('answer.text')},
                        'description_image_url', ${eb.ref('answer.description_image_url')},
                        'position', ${eb.ref('answer.position')},
                        'grade', ${eb.ref('answer.grade')},
                        'additional_info_num_lines', ${eb.ref('answer.additional_info_num_lines')},
                        'additional_info_placeholder', ${eb.ref('answer.additional_info_placeholder')},
                        'has_additional_info', ${eb.ref('answer.has_additional_info')},
                        'calls_instance_id', ${eb.ref('answer.calls_instance_id')},
                        'requires_upload', ${eb.ref('answer.requires_upload')},
                        'allowed_extensions', ${eb.ref('answer.allowed_extensions')},
                        'has_action', EXISTS(
                            SELECT 1 FROM action
                            WHERE action.answer_id = ${eb.ref('answer.id')}
                            AND action.client_id = ${ctx.session.user.client_id}
                        )
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
	pageId: string,
	filters: { claimId?: string; range: DateRangeStrict; users?: string[] }
) {
	// Collect answer counts for each question over the specified interval
	// Join once with simple FK relationship, apply filters in conditional COUNT

	// Build CASE WHEN condition for counting only matching responses
	// This preserves all answers in results while filtering what gets counted
	let countCondition = sql`question_response.id IS NOT NULL`;

	if (filters.claimId) {
		countCondition = sql`${countCondition} AND question_response.claim_id = ${filters.claimId}`;
	}

	if (filters.users?.length) {
		countCondition = sql`${countCondition} AND question_response.created_by = ANY(${filters.users})`;
	}

	if (filters.range && filters.range.some((d) => !!d)) {
		if (filters.range[0]) {
			countCondition = sql`${countCondition} AND question_response.created_at >= ${filters.range[0]}`;
		}
		if (filters.range[1]) {
			countCondition = sql`${countCondition} AND question_response.created_at <= ${filters.range[1]}`;
		}
	} else {
		// Default to last 30 days if no range provided
		countCondition = sql`${countCondition} AND question_response.created_at >= CURRENT_DATE - INTERVAL '30 days'`;
	}

	const results = await ctx.db
		.selectFrom('question')
		.innerJoin('answer', 'question.id', 'answer.question_id')
		.leftJoin('question_response_answer', 'answer.id', 'question_response_answer.answer_id')
		.leftJoin('question_response', 'question_response_answer.response_id', 'question_response.id')
		.select([
			'question.text as question_text',
			'answer.question_id',
			'answer.id as answer_id',
			'answer.text as answer_text',
			sql<string>`COUNT(CASE WHEN ${countCondition} THEN question_response.id END)`.as(
				'answer_count'
			),
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
	pageId: string,
	questionId: string,
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
	if (params.description_image_url !== undefined)
		updates.description_image_url = params.description_image_url;
	if (params.placeholder !== undefined) updates.placeholder = params.placeholder;
	if (params.hidden !== undefined) updates.hidden = params.hidden;
	if (params.page_id) updates.page_id = params.page_id;
	if (params.position && params.position !== existingQuestion.position)
		updates.position = params.position;

	// Check if converting to free-form
	const convertingToFreeform =
		params.type === QuestionType.FREEFORM && existingQuestion.type !== QuestionType.FREEFORM;

	// Delete all existing answers when converting to free-form
	if (convertingToFreeform) {
		await ctx.db
			.deleteFrom('answer')
			.where('question_id', '=', questionId)
			.where('client_id', '=', ctx.session.user.client_id)
			.execute();
	}

	// Use ROW_NUMBER() CTE to recalculate positions in a single query
	// Subtract 1 from ROW_NUMBER() since positions are 0-based
	if (updates.position) {
		await sql`
			WITH reordered AS (
				SELECT id,
					ROW_NUMBER() OVER (
						ORDER BY
							CASE
								WHEN id = ${questionId} THEN ${updates.position}
								WHEN position >= ${updates.position} AND position < ${existingQuestion.position} THEN position + 1
								WHEN position > ${existingQuestion.position} AND position <= ${updates.position} THEN position - 1
								ELSE position
							END,
							id
					) - 1 as new_position
				FROM question
				WHERE client_id = ${ctx.session.user.client_id}
					AND page_id = ${pageId}
			)
			UPDATE question
			SET position = reordered.new_position
			FROM reordered
			WHERE question.id = reordered.id
				AND question.position != reordered.new_position
		`.execute(ctx.db);
	}

	const newQuestion = await ctx.db
		.updateTable('question')
		.set({
			...updates,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		})
		.where('id', '=', questionId)
		.where('client_id', '=', ctx.session.user.client_id)
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
async function bumpPageVersion(ctx: ProtectedContext, pageId: string) {
	await ctx.db
		.updateTable('page')
		.set((eb) => ({
			version: sql`${eb.ref('version')} + 1`,
			updated_by: ctx.session.user.id,
			updated_at: sql`now()`,
		}))
		.where('id', '=', pageId)
		.where('client_id', '=', ctx.session.user.client_id)
		.execute();
}
