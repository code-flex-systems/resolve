import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type ChecklistInput = RouterInput['checklist'];
type ChecklistOutput = RouterOutput['checklist'];

export function useChecklistTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.checklist.getChecklists.useQuery,

		listForClaims: trpc.checklist.getChecklistClaims.useQuery,

		exportChecklistClaims: trpc.checklist.exportChecklistClaims.useQuery,

		listRecents: trpc.checklist.getRecentChecklistClaims.useQuery,

		count: trpc.checklist.getChecklistCount.useQuery,

		get: trpc.checklist.getChecklist.useQuery,

		getForClaim: trpc.checklist.getChecklistClaim.useQuery,

		getSummary: trpc.checklist.getChecklistSummary.useQuery,

		getSummaryDetail: trpc.checklist.getChecklistSummaryDetail.useQuery,

		progress: trpc.checklist.getChecklistClaimProgress.useQuery,

		stats: trpc.checklist.getChecklistClaimStats.useQuery,

		create: trpc.checklist.createChecklist.useMutation({
			onSuccess() {
				utils.checklist.getChecklists.invalidate();
			},
		}),

		update: trpc.checklist.updateChecklist.useMutation({
			onSuccess({ id }) {
				utils.checklist.getChecklist.invalidate({ id });
				utils.checklist.getChecklists.invalidate();
			},
		}),

		updateForClaim: trpc.checklist.updateChecklistClaim.useMutation({
			onSuccess(_, { checklistId, claimId }) {
				utils.checklist.getChecklistClaim.invalidate({ checklistId, claimId });
				utils.checklist.getChecklistClaimStats.invalidate();
			},
		}),

		remove: trpc.checklist.deleteChecklist.useMutation,
	};
}

export type CreateChecklistInput = ChecklistInput['createChecklist'];
export type UpdateChecklistInput = ChecklistInput['updateChecklist'];
export type GetChecklistOutput = ChecklistOutput['getChecklists'][number];
export type ChecklistClaim = ChecklistOutput['getChecklistClaim'];
export type ChecklistClaimsOutput = ChecklistOutput['getChecklistClaims']['rows'];
