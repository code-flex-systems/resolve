import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type CoverageOutput = RouterOutput['coverage'];

export type CoverageListItem = CoverageOutput['getCoverages'][number];

export function useCoverageTrpc() {
	const utils = trpc.useUtils();

	// Helper to update total_incurred in cached claim detail
	const updateClaimTotalIncurred = (claimId: number, totalIncurred: number) => {
		const currentData = utils.claim.getClaimDetail.getData({ claimId });
		if (currentData) {
			utils.claim.getClaimDetail.setData(
				{ claimId },
				{
					...currentData,
					total_incurred: totalIncurred,
				}
			);
		}
	};

	return {
		list: (input: { claimId: number }, options?: { enabled?: boolean }) =>
			trpc.coverage.getCoverages.useQuery(input, options),

		listByClaimParty: (input: { claimPartyId: number }, options?: { enabled?: boolean }) =>
			trpc.coverage.getCoveragesByClaimParty.useQuery(input, options),

		create: trpc.coverage.createCoverage.useMutation({
			onSuccess(data, variables) {
				// Invalidate coverages list for the specific claim
				utils.coverage.getCoverages.invalidate({ claimId: variables.claim_id });
				// Invalidate claim parties (coverages are now nested under parties)
				utils.party.getClaimParties.invalidate({ claimId: variables.claim_id });
				// Update cached claim detail with new total_incurred
				updateClaimTotalIncurred(variables.claim_id, data.totalIncurred);
			},
		}),

		update: trpc.coverage.updateCoverage.useMutation({
			onSuccess(data) {
				// Invalidate coverages list
				utils.coverage.getCoverages.invalidate();
				// Invalidate claim parties (coverages are now nested under parties)
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new total_incurred
				updateClaimTotalIncurred(data.coverage.claim_id, data.totalIncurred);
			},
		}),

		archive: trpc.coverage.archiveCoverage.useMutation({
			onSuccess(data) {
				// Invalidate all coverages lists
				utils.coverage.getCoverages.invalidate();
				// Invalidate claim parties (coverages are now nested under parties)
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new total_incurred
				updateClaimTotalIncurred(data.claimId, data.totalIncurred);
			},
		}),

		remove: trpc.coverage.deleteCoverage.useMutation({
			onSuccess(data) {
				// Invalidate all coverages lists
				utils.coverage.getCoverages.invalidate();
				// Invalidate claim parties (coverages are now nested under parties)
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new total_incurred
				updateClaimTotalIncurred(data.claimId, data.totalIncurred);
			},
		}),
	};
}
