import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';
import { usePageInstanceTreeInvalidator } from '@/lib/utils/usePageInstanceTreeInvalidator';

type AnswerInput = inferRouterInputs<AppRouter>['answer'];
type AnswerOutput = inferRouterOutputs<AppRouter>['answer'];

export function useAnswerTrpc() {
	const utils = trpc.useUtils();
	const invalidateTree = usePageInstanceTreeInvalidator();

	return {
		list: trpc.answer.getAnswersForQuestion.useQuery,

		get: trpc.answer.getAnswer.useQuery,

		create: trpc.answer.createAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),

		copy: trpc.answer.copyAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),

		update: trpc.answer.updateAnswer.useMutation({
			onSuccess: (data, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				if (data) {
					utils.answer.getAnswersForQuestion.setData({ questionId: data.question_id }, (old) => {
						if (!old) return old;
						const oldAnswerIndex = old.findIndex((a) => a.id === data.id);
						if (oldAnswerIndex !== -1) old.splice(oldAnswerIndex, 1, data);
						return old;
					});
				}
				invalidateTree();
			},
		}),

		remove: trpc.answer.deleteAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				invalidateTree();
			},
		}),
	};
}

export type CreateAnswerInput = AnswerInput['createAnswer'];
export type UpdateAnswerInput = AnswerInput['updateAnswer'];
export type Answer = NonNullable<AnswerOutput['getAnswer']>;
