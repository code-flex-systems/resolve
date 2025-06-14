import * as answerQueries from '@/api/queries/answerQueries';
import { ProtectedContext } from '@/server/trpc/trpc';

export async function createAnswer(
	ctx: ProtectedContext,
	{
		pageId,
		questionId,
		params,
	}: {
		pageId: number;
		questionId: number;
		params: object;
	}
) {
	let results = await answerQueries.createAnswer(ctx, pageId, questionId, params);
	return results;
}

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
		let existingAnswer = await answerQueries.getAnswer(ctx, answerId);
		if (!existingAnswer) throw new Error('Answer does not exist');
		let results = await answerQueries.createAnswer(ctx, pageId, questionId, existingAnswer);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function deleteAnswer(ctx: ProtectedContext, { pageId, answerId }: { pageId: number; answerId: number }) {
	try {
		await answerQueries.deleteAnswer(ctx, pageId, answerId);
	} catch (e) {
		console.error(e);
	}
}

export async function getAnswer(ctx: ProtectedContext, { id }: { id: number }) {
	try {
		let results = await answerQueries.getAnswer(ctx, id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function getAnswers(ctx: ProtectedContext, { questionId }: { questionId: number }) {
	try {
		let results = await answerQueries.getAnswers(ctx, questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

export async function modifyAnswer(
	ctx: ProtectedContext,
	{ pageId, answerId, params }: { pageId: number; answerId: number; params: object }
) {
	try {
		let results = await answerQueries.modifyAnswer(ctx, pageId, answerId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
