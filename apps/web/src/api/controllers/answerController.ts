import * as answerQueries from '@/api/queries/answerQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import type { AnswerParams, AnswerUpdateParams } from '@/schemas/answerSchemas';
import { logAdminAction, AdminAction } from '@/api/utils/adminActionLogger';
import { EntityName } from '@/api/utils/activityLogger';

/**
 * Create an answer for a question.
 *
 * @param ctx - request context
 * @param input - page id, question id and answer fields
 * @returns the newly created answer
 */

export async function createAnswer(
	ctx: ProtectedContext,
	{
		pageId,
		questionId,
		params,
	}: {
		pageId: number;
		questionId: number;
		params: AnswerParams;
	}
) {
	// Create answer and log admin action within transaction
	const results = await ctx.db.transaction().execute(async (trx) => {
		const created = await answerQueries.createAnswer({ ...ctx, db: trx }, pageId, questionId, params);

		// Log answer creation
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: created.id,
			entityName: EntityName.ANSWER,
			action: AdminAction.CREATE,
			value: { text: created.text, grade: created.grade, questionId, pageId },
		});

		return created;
	});

	return results;
}

/**
 * Copy an existing answer to a target question using INSERT...SELECT.
 *
 * @param ctx - request context
 * @param input - page id, question id and answer id
 */
export async function copyAnswer(
	ctx: ProtectedContext,
	{
		pageId,
		questionId,
		answerId,
	}: {
		pageId: number;
		questionId: number;
		answerId: number;
	}
) {
	// Copy answer and log admin action within transaction
	const created = await ctx.db.transaction().execute(async (trx) => {
		const newAnswer = await answerQueries.copyAnswer({ ...ctx, db: trx }, pageId, questionId, answerId);

		// Log answer creation (copied from source)
		await logAdminAction({ ...ctx, db: trx }, {
			entityId: newAnswer.id,
			entityName: EntityName.ANSWER,
			action: AdminAction.CREATE,
			value: { text: newAnswer.text, grade: newAnswer.grade, questionId, pageId, sourceAnswerId: answerId, copied: true },
		});

		return newAnswer;
	});

	return created;
}

/**
 * Delete an answer.
 *
 * @param ctx - request context
 * @param input - page and answer identifiers
 */
export async function deleteAnswer(ctx: ProtectedContext, { pageId, answerId }: { pageId: number; answerId: number }) {
	// Delete answer and log admin action within transaction
	await ctx.db.transaction().execute(async (trx) => {
		// Fetch answer data BEFORE deletion for logging
		const answer = await answerQueries.getAnswerForDeletion({ ...ctx, db: trx }, answerId);

		// Delete the answer
		await answerQueries.deleteAnswer({ ...ctx, db: trx }, pageId, answerId);

		// Log admin action for answer deletion
		if (answer) {
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: answerId,
				entityName: EntityName.ANSWER,
				action: AdminAction.DELETE,
				value: { text: answer.text, grade: answer.grade, questionId: answer.question_id },
			});
		}
	});
}

/**
 * Retrieve a single answer.
 *
 * @param ctx - request context
 * @param input - answer id
 */
export async function getAnswer(ctx: ProtectedContext, { id }: { id: number }) {
	return await answerQueries.getAnswer(ctx, id);
}

/**
 * List answers for a question.
 *
 * @param ctx - request context
 * @param input - question id
 */
export async function getAnswers(ctx: ProtectedContext, { questionId }: { questionId: number }) {
	return await answerQueries.getAnswers(ctx, questionId);
}

/*
 * Update an answer through the queries layer.
 *
 * @param ctx - request context
 * @param input - page id, answer id and fields
 * @returns the updated answer
 */
export async function modifyAnswer(
	ctx: ProtectedContext,
	{ pageId, answerId, params }: { pageId: number; answerId: number; params: AnswerUpdateParams }
) {
	try {
		// Update answer and log admin action within transaction
		const results = await ctx.db.transaction().execute(async (trx) => {
			const updated = await answerQueries.modifyAnswer({ ...ctx, db: trx }, pageId, answerId, params);

			// Log admin action for answer update
			await logAdminAction({ ...ctx, db: trx }, {
				entityId: answerId,
				entityName: EntityName.ANSWER,
				action: AdminAction.UPDATE,
				value: params,
			});

			return updated;
		});

		return results;
	} catch (e) {
		console.error(e);
	}
}

/**
 * Get the answer call graph for a checklist.
 *
 * @param ctx - request context
 * @param input - checklist id
 * @returns array of answer calls (from instance -> to instance)
 */
export async function getAnswerCallGraph(ctx: ProtectedContext, { checklistId }: { checklistId: number }) {
	return await answerQueries.getAnswerCallGraph(ctx, checklistId);
}
