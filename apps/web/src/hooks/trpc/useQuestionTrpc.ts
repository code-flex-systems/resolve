import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';
import { usePageInstanceTreeInvalidator } from '@/lib/utils/usePageInstanceTreeInvalidator';

type QuestionInput = inferRouterInputs<AppRouter>['question'];
type QuestionOutput = inferRouterOutputs<AppRouter>['question'];

export function useQuestionTrpc() {
	const utils = trpc.useUtils();
	const invalidateTree = usePageInstanceTreeInvalidator();

	return {
		list: trpc.question.getQuestions.useQuery,

		get: trpc.question.getQuestion.useQuery,

		getStats: trpc.question.getQuestionStats.useQuery,

		create: trpc.question.createQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),

		copy: trpc.question.copyQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),

		update: trpc.question.updateQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),

		remove: trpc.question.deleteQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),
	};
}

export type CreateQuestionInput = QuestionInput['createQuestion'];
export type UpdateQuestionInput = QuestionInput['updateQuestion'];
export type Question = QuestionOutput['getQuestions'][number];
