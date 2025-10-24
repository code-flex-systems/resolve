import * as answerQueries from '@/api/queries/answerQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { TRPCError } from '@trpc/server';
import type { AnswerParams, AnswerUpdateParams } from '@/schemas/answerSchemas';

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
        const results = await answerQueries.createAnswer(ctx, pageId, questionId, params);
        return results;
}

/**
 * Copy an existing answer to a target question.
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
	try {
		const existingAnswer = await answerQueries.getAnswer(ctx, answerId);
		if (!existingAnswer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Answer does not exist' });
		const results = await answerQueries.createAnswer(ctx, pageId, questionId, existingAnswer);
		return results;
	} catch (e) {
		console.error(e);
	}
}

/**
 * Delete an answer.
 *
 * @param ctx - request context
 * @param input - page and answer identifiers
 */
export async function deleteAnswer(ctx: ProtectedContext, { pageId, answerId }: { pageId: number; answerId: number }) {
	try {
		await answerQueries.deleteAnswer(ctx, pageId, answerId);
	} catch (e) {
		console.error(e);
	}
}

/**
 * Retrieve a single answer.
 *
 * @param ctx - request context
 * @param input - answer id
 */
export async function getAnswer(ctx: ProtectedContext, { id }: { id: number }) {
	try {
		const results = await answerQueries.getAnswer(ctx, id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

/**
 * List answers for a question.
 *
 * @param ctx - request context
 * @param input - question id
 */
export async function getAnswers(ctx: ProtectedContext, { questionId }: { questionId: number }) {
	try {
		const results = await answerQueries.getAnswers(ctx, questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
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
                const results = await answerQueries.modifyAnswer(ctx, pageId, answerId, params);
                return results;
	} catch (e) {
		console.error(e);
	}
}
