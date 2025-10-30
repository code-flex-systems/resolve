import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';
import { usePageInstanceTreeInvalidator } from '@/lib/utils/usePageInstanceTreeInvalidator';

type AnswerInput = RouterInput['answer'];
type AnswerOutput = RouterOutput['answer'];

export function useAnswerTrpc() {
	const utils = trpc.useUtils();
	const invalidateTree = usePageInstanceTreeInvalidator();

	return {
		list: trpc.answer.getAnswersForQuestion.useQuery,

		get: trpc.answer.getAnswer.useQuery,

		getCallGraph: trpc.answer.getAnswerCallGraph.useQuery,

		create: trpc.answer.createAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				// Invalidate call graph when answer with calls_instance_id is created
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),

		copy: trpc.answer.copyAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				// Invalidate call graph when answer is copied (may have calls_instance_id)
				utils.answer.getAnswerCallGraph.invalidate();
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
				// Invalidate call graph when answer is updated (calls_instance_id may have changed)
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),

		remove: trpc.answer.deleteAnswer.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				// Invalidate call graph when answer is deleted (may have had calls_instance_id)
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),
	};
}

export type CreateAnswerInput = AnswerInput['createAnswer'];
export type UpdateAnswerInput = AnswerInput['updateAnswer'];
export type Answer = NonNullable<AnswerOutput['getAnswer']>;
