import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type ClaimOutput = RouterOutput['claim'];

export function useClaimTrpc() {
	const utils = trpc.useUtils();

	return {
		assign: trpc.claim.assignClaim.useMutation(),

		list: trpc.claim.getClaims.useQuery,

		count: trpc.claim.getClaimCount.useQuery,

		countRollover: trpc.claim.getRolloverClaimCount.useQuery,

		get: trpc.claim.getClaim.useQuery,

		getNextToAssign: trpc.claim.getNextClaimToAssign.useQuery,

		createMany: trpc.claim.createClaims.useMutation({
			onSuccess() {
				utils.claim.getClaims.invalidate();
			},
		}),
	};
}

export type Claim = ClaimOutput['getClaim'];
