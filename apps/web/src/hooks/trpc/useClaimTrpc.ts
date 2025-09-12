import { trpc } from '@/lib/trpc';
import type { inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type ClaimOutput = inferRouterOutputs<AppRouter>['claim'];

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
