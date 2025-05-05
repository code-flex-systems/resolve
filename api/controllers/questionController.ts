import { r } from 'react-router/dist/development/fog-of-war-BaM-ohjc';
import questionQueries from '../queries/questionQueries';
import { AnswerStat, QuestionStat } from '../types/types';

export default {
	createQuestion,
	copyQuestion,
	deleteQuestion,
	getQuestion,
	getQuestions,
	getQuestionStats,
	modifyQuestion,
};

async function createQuestion(pageId: number, params: object) {
	try {
		let results = await questionQueries.createQuestion(pageId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function copyQuestion(pageId: number, questionId: number) {
	try {
		let results = await questionQueries.copyQuestion(pageId, questionId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deleteQuestion(pageId: number, questionId: number) {
	try {
		await questionQueries.deleteQuestion(pageId, questionId);
	} catch (e) {
		console.error(e);
	}
}

async function getQuestion(id: number) {
	try {
		let results = await questionQueries.getQuestion(id);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getQuestions(pageId: number) {
	try {
		let results = await questionQueries.getQuestions(pageId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getQuestionStats(pageId: number) {
	try {
		let results = await questionQueries.getQuestionStats(pageId);
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
	} catch (e) {
		console.error(e);
	}
}

async function modifyQuestion(pageId: number, questionId: number, params: object) {
	try {
		let results = await questionQueries.modifyQuestion(pageId, questionId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}
