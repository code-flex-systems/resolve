import * as questionQueries from '@/api/queries/questionQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { AnswerStat, Interval, QuestionStat } from '@/types/types';

export async function createQuestion(ctx: ProtectedContext, { pageId, params }: { pageId: number; params: object }) {
	let results = await questionQueries.createQuestion(ctx, pageId, params);
	return results;
}

export async function copyQuestion(
	ctx: ProtectedContext,
	{ pageId, questionId }: { pageId: number; questionId: number }
) {
	let results = await questionQueries.copyQuestion(ctx, pageId, questionId);
	return results;
}

export async function deleteQuestion(
	ctx: ProtectedContext,
	{ pageId, questionId }: { pageId: number; questionId: number }
) {
	await questionQueries.deleteQuestion(ctx, pageId, questionId);
}

export async function getQuestion(ctx: ProtectedContext, { id }: { id: number }) {
	let results = await questionQueries.getQuestion(ctx, id);
	return results;
}

export async function getQuestions(ctx: ProtectedContext, { pageId }: { pageId: number }) {
	let results = await questionQueries.getQuestions(ctx, pageId);
	return results;
}

export async function getQuestionStats(
	ctx: ProtectedContext,
	{ pageId, interval }: { pageId: number; interval?: Interval<string> }
) {
	let results = await questionQueries.getQuestionStats(ctx, pageId, interval);
	let formattedResults: QuestionStat[] = [];
	let seenQuestionIds = new Set<number>();
	(results ?? []).forEach((row) => {
		let answerStat: AnswerStat = {
			answer_id: row.answer_id,
			answer_text: row.answer_text,
			answer_count: +row.answer_count,
		};
		if (seenQuestionIds.has(row.question_id)) {
			let result = formattedResults.find((r) => r.question_id === row.question_id);
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

export async function modifyQuestion(
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
	let results = await questionQueries.modifyQuestion(ctx, pageId, questionId, params);
	return results;
}
