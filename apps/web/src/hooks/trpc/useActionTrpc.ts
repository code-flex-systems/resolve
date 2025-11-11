import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type ActionOutput = RouterOutput['action'];

export function useActionTrpc() {
	const utils = trpc.useUtils();
	return {
		create: trpc.action.upsertAction.useMutation(),
		get: trpc.action.getAction.useQuery,
		stats: trpc.action.getActionStats.useQuery,
		statsDetail: trpc.action.getActionStatsDetail.useQuery,
	};
}

export type GetActionOutput = ActionOutput['getAction'];
