import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type ResponseInput = inferRouterInputs<AppRouter>['response'];
type ResponseOutput = inferRouterOutputs<AppRouter>['response'];

export function useResponseTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.response.getResponsesForChecklist.useQuery,

		listForAnswer: trpc.response.getResponsesForAnswer.useQuery,

		evaluate: trpc.response.evaluateResponses.useQuery,

		createUpdateMany: trpc.response.upsertQuestionResponses.useMutation,
	};
}

export type UpsertResponseInput = ResponseInput['upsertQuestionResponses'];
export type Response = ResponseOutput['getResponsesForChecklist'][number];
