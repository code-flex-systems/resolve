import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type ClaimOutput = RouterOutput['claim'];

export function useClaimTrpc() {
	const utils = trpc.useUtils();

	return {
		assign: trpc.claim.assignClaim.useMutation(),

		list: trpc.claim.getClaims.useQuery,

		listMyClaims: trpc.claim.listMyClaims.useQuery,

		listMyDeskClaims: trpc.claim.listMyDeskClaims.useQuery,

		count: trpc.claim.getClaimCount.useQuery,

		countRollover: trpc.claim.getRolloverClaimCount.useQuery,

		get: trpc.claim.getClaim.useQuery,

		getNextToAssign: trpc.claim.getNextClaimToAssign.useQuery,

		createMany: trpc.claim.createClaims.useMutation({
			onSuccess(data) {
				// Invalidate claims list
				utils.claim.getClaims.invalidate();
				utils.claim.listMyClaims.invalidate();
				// Invalidate party relationships for newly created claims
				if (data && Array.isArray(data)) {
					data.forEach((claim) => {
						if (claim.id) {
							utils.party.getClaimParties.invalidate({ claimId: claim.id });
						}
					});
				}
			},
		}),

		update: trpc.claim.updateClaim.useMutation({
			onSuccess(_data, variables) {
				// Invalidate claim queries
				utils.claim.getClaims.invalidate();
				utils.claim.listMyClaims.invalidate();
				utils.claim.getClaim.invalidate({ claimId: variables.claimId });
				// Invalidate party relationships since linking/unlinking may have occurred
				utils.party.getClaimParties.invalidate({ claimId: variables.claimId });
			},
		}),
	};
}

export type Claim = ClaimOutput['getClaim'];
export type MyClaimListItem = ClaimOutput['listMyClaims']['rows'][number];
export type MyClaimsMetrics = ClaimOutput['listMyClaims']['metrics'];
