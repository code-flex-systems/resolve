import * as questionQueries from '@/api/queries/questionQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { AnswerStat, DateRangeStrict, QuestionStat } from '@/types/types';
import type { QuestionParams, QuestionUpdateParams } from '@/schemas/questionSchemas';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';

/**
 * Insert a question onto a page.
 *
 * @param ctx - request context
 * @param input - page id and question fields
 */
export async function createQuestion(
	ctx: ProtectedContext,
	{ pageId, params }: { pageId: number; params: QuestionParams }
) {
	// Create question and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const created = await questionQueries.createQuestion({ ...ctx, db: trx }, pageId, params);

		// Log question creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: created.id,
			entityName: EntityName.QUESTION,
			action: AdminAction.CREATE,
			value: { text: created.text, type: created.type, pageId },
		});

		return created;
	});

	return results;
}

/**
 * Duplicate a question and its answers.
 *
 * @param ctx - request context
 * @param input - page id and question id
 */
export async function copyQuestion(
	ctx: ProtectedContext,
	{ pageId, questionId }: { pageId: number; questionId: number }
) {
	// Copy question and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const created = await questionQueries.copyQuestion({ ...ctx, db: trx }, pageId, questionId);

		// Log question creation (copied from source)
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: created.id,
			entityName: EntityName.QUESTION,
			action: AdminAction.CREATE,
			value: { text: created.text, type: created.type, pageId, sourceQuestionId: questionId, copied: true },
		});

		return created;
	});

	return results;
}

/**
 * Remove a question from a page.
 *
 * @param ctx - request context
 * @param input - page id and question id
 */
export async function deleteQuestion(
	ctx: ProtectedContext,
	{ pageId, questionId }: { pageId: number; questionId: number }
) {
	// Delete question and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch question data BEFORE deletion for logging
		const question = await questionQueries.getQuestionForDeletion({ ...ctx, db: trx }, questionId);

		// Delete the question
		await questionQueries.deleteQuestion({ ...ctx, db: trx }, pageId, questionId);

		// Log admin action for question deletion
		if (question) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: questionId,
				entityName: EntityName.QUESTION,
				action: AdminAction.DELETE,
				value: { text: question.text, type: question.type, pageId: question.page_id },
			});
		}
	});
}

/**
 * Fetch a question by id.
 *
 * @param ctx - request context
 * @param input - question id
 */
export async function getQuestion(ctx: ProtectedContext, { id }: { id: number }) {
	const results = await questionQueries.getQuestion(ctx, id);
	return results;
}

/**
 * Retrieve questions for a page.
 *
 * @param ctx - request context
 * @param input - page id
 */
export async function getQuestions(ctx: ProtectedContext, { pageId }: { pageId: number }) {
	const results = await questionQueries.getQuestions(ctx, pageId);
	return results;
}

/**
 * Summarize answer statistics for each question.
 *
 * @param ctx - request context
 * @param input - page id and optional interval
 */
export async function getQuestionStats(
	ctx: ProtectedContext,
	{ pageId, filters }: { pageId: number; filters: { claimId?: number; range: DateRangeStrict; users?: string[] } }
) {
	const results = await questionQueries.getQuestionStats(ctx, pageId, filters);
	const formattedResults: QuestionStat[] = [];
	const seenQuestionIds = new Set<number>();
	// Aggregate answers under their respective questions
	(results ?? []).forEach((row) => {
		const answerStat: AnswerStat = {
			answer_id: row.answer_id,
			answer_text: row.answer_text,
			answer_count: +row.answer_count,
		};
		if (seenQuestionIds.has(row.question_id)) {
			const result = formattedResults.find((r) => r.question_id === row.question_id);
			if (result) result.answers.push(answerStat);
		} else {
			formattedResults.push({
				question_id: row.question_id,
				question_text: row.question_text,
				answers: [answerStat],
			});
			seenQuestionIds.add(row.question_id);
		}
	});
	return formattedResults;
}

/**
 * Update a question or move it to another page.
 *
 * @param ctx - request context
 * @param input - page id, question id and update fields
 */
export async function modifyQuestion(
	ctx: ProtectedContext,
	{
		pageId,
		questionId,
		params,
	}: {
		pageId: number;
		questionId: number;
		params: QuestionUpdateParams;
	}
) {
	// Update question and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const updated = await questionQueries.modifyQuestion({ ...ctx, db: trx }, pageId, questionId, params);

		// Log admin action for question update
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: questionId,
			entityName: EntityName.QUESTION,
			action: AdminAction.UPDATE,
			value: params,
		});

		return updated;
	});

	return results;
}
