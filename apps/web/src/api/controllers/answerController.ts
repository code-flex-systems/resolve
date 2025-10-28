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
	const existingAnswer = await answerQueries.getAnswer(ctx, answerId);
	if (!existingAnswer) throw new TRPCError({ code: 'NOT_FOUND', message: 'Answer does not exist' });

	// Extract only AnswerParams fields from the database object
	// Database numeric fields (grade, additional_info_num_lines) are returned as strings
	// and need to be converted to numbers for the AnswerParams type
	const answerParams: AnswerParams = {
		text: existingAnswer.text,
		position: existingAnswer.position,
		grade: existingAnswer.grade ? Number(existingAnswer.grade) : null,
		description_text: existingAnswer.description_text,
		description_image_url: existingAnswer.description_image_url,
		has_additional_info: existingAnswer.has_additional_info,
		additional_info_placeholder: existingAnswer.additional_info_placeholder,
		additional_info_num_lines: existingAnswer.additional_info_num_lines ? Number(existingAnswer.additional_info_num_lines) : null,
		calls_instance_id: existingAnswer.calls_instance_id,
		hidden: existingAnswer.hidden,
	};

	return await answerQueries.createAnswer(ctx, pageId, questionId, answerParams);
}

/**
 * Delete an answer.
 *
 * @param ctx - request context
 * @param input - page and answer identifiers
 */
export async function deleteAnswer(ctx: ProtectedContext, { pageId, answerId }: { pageId: number; answerId: number }) {
	await answerQueries.deleteAnswer(ctx, pageId, answerId);
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
		const results = await answerQueries.modifyAnswer(ctx, pageId, answerId, params);
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
