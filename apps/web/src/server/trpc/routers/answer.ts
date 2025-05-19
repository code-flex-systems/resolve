import { router, publicProcedure } from '../trpc';
import {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	copyAnswer,
	modifyAnswer,
} from '@/api/controllers/answerController';
import {
	copyAnswerInput,
	createAnswerInput,
	deleteAnswerInput,
	getAnswerInput,
	getAnswersInput,
	modifyAnswerInput,
} from '@/schemas/answerSchemas';

export const answerRouter = router({
	getAnswer: publicProcedure.input(getAnswerInput).query(async ({ input }) => {
		return getAnswer(input);
	}),

	getAnswersForQuestion: publicProcedure.input(getAnswersInput).query(async ({ input }) => {
		return getAnswers(input);
	}),

	createAnswer: publicProcedure.input(createAnswerInput).mutation(async ({ input }) => {
		return createAnswer(input);
	}),

	updateAnswer: publicProcedure.input(modifyAnswerInput).mutation(async ({ input }) => {
		return modifyAnswer(input);
	}),

	copyAnswer: publicProcedure.input(copyAnswerInput).mutation(async ({ input }) => {
		return copyAnswer(input);
	}),

	deleteAnswer: publicProcedure.input(deleteAnswerInput).mutation(async ({ input }) => {
		return deleteAnswer(input);
	}),
});
