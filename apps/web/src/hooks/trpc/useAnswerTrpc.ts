import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type AnswerInput = inferRouterInputs<AppRouter>['answer'];
type AnswerOutput = inferRouterOutputs<AppRouter>['answer'];

export function useAnswerTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.answer.getAnswersForQuestion.useQuery,

		get: trpc.answer.getAnswer.useQuery,

		create: trpc.answer.createAnswer.useMutation,

		copy: trpc.answer.copyAnswer.useMutation,

		update: trpc.answer.updateAnswer.useMutation,

		remove: trpc.answer.deleteAnswer.useMutation,
	};
}

export type CreateAnswerInput = AnswerInput['createAnswer'];
export type UpdateAnswerInput = AnswerInput['updateAnswer'];
export type Answer = AnswerOutput['getAnswersForQuestion'][number];
