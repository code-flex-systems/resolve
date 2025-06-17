import { router, protectedProcedure } from '../trpc';

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
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';

export const questionRouter = router({
	getQuestion: protectedProcedure.input(getQuestionInput).query(async ({ input, ctx }) => {
		return getQuestion(ctx, input);
	}),

	getQuestions: protectedProcedure.input(getQuestionsInput).query(async ({ input, ctx }) => {
		return getQuestions(ctx, input);
	}),

	getQuestionStats: protectedProcedure.input(getQuestionStatsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getQuestionStats(ctx, input);
	}),

	createQuestion: protectedProcedure.input(createQuestionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createQuestion(ctx, input);
	}),

	updateQuestion: protectedProcedure.input(modifyQuestionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return modifyQuestion(ctx, input);
	}),

	copyQuestion: protectedProcedure.input(copyQuestionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return copyQuestion(ctx, input);
	}),

	deleteQuestion: protectedProcedure.input(deleteQuestionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteQuestion(ctx, input);
	}),
});
