import { router, publicProcedure } from '../trpc';
import { z } from 'zod';

import {
	createQuestion,
	modifyQuestion,
	deleteQuestion,
	copyQuestion,
	getQuestion,
	getQuestions,
	getQuestionStats,
} from '@/api/controllers/questionController';
import {
	copyQuestionInput,
	createQuestionInput,
	deleteQuestionInput,
	getQuestionInput,
	getQuestionsInput,
	getQuestionStatsInput,
	modifyQuestionInput,
} from '@/schemas/questionSchemas';

export const questionRouter = router({
	getQuestion: publicProcedure.input(getQuestionInput).query(async ({ input }) => {
		return getQuestion(input);
	}),

	getQuestions: publicProcedure.input(getQuestionsInput).query(async ({ input }) => {
		return getQuestions(input);
	}),

	getQuestionStats: publicProcedure.input(getQuestionStatsInput).query(async ({ input }) => {
		return getQuestionStats(input);
	}),

	createQuestion: publicProcedure.input(createQuestionInput).mutation(async ({ input }) => {
		return createQuestion(input);
	}),

	updateQuestion: publicProcedure.input(modifyQuestionInput).mutation(async ({ input }) => {
		return modifyQuestion(input);
	}),

	copyQuestion: publicProcedure.input(copyQuestionInput).mutation(async ({ input }) => {
		return copyQuestion(input);
	}),

	deleteQuestion: publicProcedure.input(deleteQuestionInput).mutation(async ({ input }) => {
		return deleteQuestion(input);
	}),
});
