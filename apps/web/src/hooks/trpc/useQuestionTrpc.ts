import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';
import { usePageInstanceTreeInvalidator } from '@/lib/utils/usePageInstanceTreeInvalidator';

type QuestionInput = RouterInput['question'];
type QuestionOutput = RouterOutput['question'];

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
				// Invalidate call graph when copying (answers with calls_instance_id are copied)
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),

		update: trpc.question.updateQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				// Invalidate call graph when updating (may convert to FREEFORM and delete answers)
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),

		remove: trpc.question.deleteQuestion.useMutation({
			onSuccess: (_, variables) => {
				utils.question.getQuestions.invalidate({ pageId: variables.pageId });
				// Invalidate call graph when deleting (CASCADE deletes answers)
				utils.answer.getAnswerCallGraph.invalidate();
				invalidateTree();
			},
		}),
	};
}

export type CreateQuestionInput = QuestionInput['createQuestion'];
export type UpdateQuestionInput = QuestionInput['updateQuestion'];
export type Question = QuestionOutput['getQuestions'][number];
