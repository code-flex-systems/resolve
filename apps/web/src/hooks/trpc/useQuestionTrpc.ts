import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type QuestionInput = inferRouterInputs<AppRouter>['question'];
type QuestionOutput = inferRouterOutputs<AppRouter>['question'];

export function useQuestionTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.question.getQuestions.useQuery,

		get: trpc.question.getQuestion.useQuery,

		getStats: trpc.question.getQuestionStats.useQuery,

		create: trpc.question.createQuestion.useMutation,

		copy: trpc.question.copyQuestion.useMutation,

		update: trpc.question.updateQuestion.useMutation,

		remove: trpc.question.deleteQuestion.useMutation,
	};
}

export type CreateQuestionInput = QuestionInput['createQuestion'];
export type UpdateQuestionInput = QuestionInput['updateQuestion'];
export type Question = QuestionOutput['getQuestions'][number];
