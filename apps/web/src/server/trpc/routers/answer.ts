import { router, protectedProcedure } from '../trpc';
import {
	createAnswer,
	deleteAnswer,
	getAnswer,
	getAnswers,
	copyAnswer,
	modifyAnswer,
	getAnswerCallGraph,
} from '@/api/controllers/answerController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	copyAnswerInput,
	createAnswerInput,
	deleteAnswerInput,
	getAnswerInput,
	getAnswersInput,
	modifyAnswerInput,
	getAnswerCallGraphInput,
} from '@/schemas/answerSchemas';

export const answerRouter = router({
	getAnswer: protectedProcedure.input(getAnswerInput).query(async ({ input, ctx }) => {
		return getAnswer(ctx, input);
	}),

	getAnswersForQuestion: protectedProcedure.input(getAnswersInput).query(async ({ input, ctx }) => {
		return getAnswers(ctx, input);
	}),

	createAnswer: protectedProcedure.input(createAnswerInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createAnswer(ctx, input);
	}),

	updateAnswer: protectedProcedure.input(modifyAnswerInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return modifyAnswer(ctx, input);
	}),

	copyAnswer: protectedProcedure.input(copyAnswerInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return copyAnswer(ctx, input);
	}),

	deleteAnswer: protectedProcedure.input(deleteAnswerInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteAnswer(ctx, input);
	}),

	getAnswerCallGraph: protectedProcedure
		.input(getAnswerCallGraphInput)
		.query(async ({ input, ctx }) => {
			return getAnswerCallGraph(ctx, input);
		}),
});
