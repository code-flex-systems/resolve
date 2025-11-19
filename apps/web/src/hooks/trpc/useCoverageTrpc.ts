import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type CoverageOutput = RouterOutput['coverage'];

export type CoverageListItem = CoverageOutput['getCoverages'][number];

export function useCoverageTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.coverage.getCoverages.useQuery,

		create: trpc.coverage.createCoverage.useMutation({
			onSuccess(_data, variables) {
				// Invalidate coverages list for the specific claim
				utils.coverage.getCoverages.invalidate({ claimId: variables.claim_id });
			},
		}),

		update: trpc.coverage.updateCoverage.useMutation({
			onSuccess(_data, variables) {
				// Invalidate coverages list for any claims (we don't have claim_id in update variables)
				utils.coverage.getCoverages.invalidate();
			},
		}),

		remove: trpc.coverage.deleteCoverage.useMutation({
			onSuccess() {
				// Invalidate all coverages lists
				utils.coverage.getCoverages.invalidate();
			},
		}),
	};
}
