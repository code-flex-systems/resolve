import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';
import * as utils from '@/lib/utils/utils';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useChecklistParams } from '../useChecklistParams';

type ResponseInput = RouterInput['response'];
type ResponseOutput = RouterOutput['response'];

export function useResponseTrpc() {
	const trpcUtils = trpc.useUtils();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();

	return {
		list: trpc.response.getResponsesForPageInstance.useQuery,

		listForAnswer: trpc.response.getResponsesForAnswer.useQuery,

		listLogs: trpc.response.getResponseAuditLogs.useQuery,

		exportLogs: trpc.response.exportResponseAuditLogs.useQuery,

		listLogStats: trpc.response.getResponseAuditLogStats.useQuery,

		evaluate: trpc.response.evaluateResponses.useMutation,

		createUpdateMany: trpc.response.upsertQuestionResponses.useMutation({
			onSuccess({ updatedInstanceId, status, claimStatus, visibleIds }) {
				trpcUtils.response.getResponsesForPageInstance.invalidate({
					checklistId,
					claimId,
					instanceId: updatedInstanceId,
				});
				trpcUtils.checklist.getChecklistClaimProgress.invalidate({
					checklistId,
					claimId,
				});
				trpcUtils.checklist.getChecklistClaim.invalidate({
					checklistId,
					claimId,
				});
				trpcUtils.response.getResponseAuditLogs.invalidate({ filters: { checklistId, claimId } });

				if (status) {
					trpcUtils.page.getPageInstanceTree.setData({ checklistId, claimId }, (old) => {
						if (!old) return old;
						const updatedTree = utils.updatePropertyInTree(old.tree, updatedInstanceId, 'status', status);
						return { ...old, tree: updatedTree };
					});
					useChecklistStore.getState().updateSelectedPageInfoStatus(status);
				}
				if (claimStatus) {
					trpcUtils.claim.getClaim.setData({ checklistId, claimId }, (old) => {
						if (!old) return old;
						return { ...old, status: claimStatus };
					});
				}
				if (visibleIds) {
					trpcUtils.page.getVisiblePageInstances.setData({ checklistId, claimId }, visibleIds);
				}
			},
		}),
	};
}

export type UpsertResponseInput = ResponseInput['upsertQuestionResponses'];
export type Response = ResponseOutput['getResponsesForPageInstance'][number];
