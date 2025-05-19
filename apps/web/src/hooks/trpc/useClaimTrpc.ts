import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type ClaimInput = inferRouterInputs<AppRouter>['claim'];
type ClaimOutput = inferRouterOutputs<AppRouter>['claim'];

export function useClaimTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.claim.getClaims.useQuery,

		get: trpc.claim.getClaim.useQuery,
	};
}

export type Claim = ClaimOutput['getClaims'][number];
