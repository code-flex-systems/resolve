import * as questionQueries from '@/api/queries/questionQueries';
import { AnswerStat, Interval, QuestionStat } from '@/types/types';

export async function createQuestion({ pageId, params }: { pageId: number; params: object }) {
	let results = await questionQueries.createQuestion(pageId, params);
	return results;
}

export async function copyQuestion({ pageId, questionId }: { pageId: number; questionId: number }) {
	let results = await questionQueries.copyQuestion(pageId, questionId);
	return results;
}

export async function deleteQuestion({ pageId, questionId }: { pageId: number; questionId: number }) {
	await questionQueries.deleteQuestion(pageId, questionId);
}

export async function getQuestion({ id }: { id: number }) {
	let results = await questionQueries.getQuestion(id);
	return results;
}

export async function getQuestions({ pageId }: { pageId: number }) {
	let results = await questionQueries.getQuestions(pageId);
	return results;
}

export async function getQuestionStats({ pageId, interval }: { pageId: number; interval?: Interval<string> }) {
	let results = await questionQueries.getQuestionStats(pageId, interval);
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

export async function modifyQuestion({
	pageId,
	questionId,
	params,
}: {
	pageId: number;
	questionId: number;
	params: object;
}) {
	let results = await questionQueries.modifyQuestion(pageId, questionId, params);
	return results;
}
