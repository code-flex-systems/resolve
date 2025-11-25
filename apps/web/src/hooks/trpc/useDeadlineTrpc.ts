import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type DeadlineOutput = RouterOutput['deadline'];

export function useDeadlineTrpc() {
	const utils = trpc.useUtils();

	return {
		// Deadline hooks
		createDeadline: trpc.deadline.createDeadline.useMutation({
			onSuccess(_data, variables) {
				// Invalidate deadlines list for this claim
				utils.deadline.listDeadlines.invalidate({ claimId: variables.claimId });
			},
		}),

		listDeadlines: trpc.deadline.listDeadlines.useQuery,

		updateDeadlineStatus: trpc.deadline.updateDeadlineStatus.useMutation({
			onSuccess() {
				// Invalidate all deadlines queries since we don't know which filters were used
				utils.deadline.listDeadlines.invalidate();
			},
		}),

		deleteDeadline: trpc.deadline.deleteDeadline.useMutation({
			onSuccess() {
				// Invalidate all deadlines queries
				utils.deadline.listDeadlines.invalidate();
			},
		}),
	};
}

// Export types for use in components
export type Deadline = DeadlineOutput['listDeadlines']['rows'][number];
