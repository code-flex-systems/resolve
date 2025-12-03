import { trpc } from '@/lib/trpc';

/**
 * Custom hook for claim liability management tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 */
export function useLiabilityTrpc() {
	const utils = trpc.useUtils();

	// Helper to update expected_recovery in cached claim detail
	const updateClaimExpectedRecovery = (claimId: number, expectedRecovery: number) => {
		const currentData = utils.claim.getClaimDetail.getData({ claimId });
		if (currentData) {
			utils.claim.getClaimDetail.setData({ claimId }, {
				...currentData,
				expected_recovery: expectedRecovery,
			});
		}
	};

	return {
		// ====================================================================
		// LIABILITY QUERY OPERATIONS
		// ====================================================================

		/**
		 * Get all liabilities for a specific claim_party
		 */
		listClaimPartyLiabilities: trpc.liability.getClaimPartyLiabilities.useQuery,

		/**
		 * Get all liabilities for a claim
		 */
		listClaimLiabilities: trpc.liability.getClaimLiabilities.useQuery,

		/**
		 * Get single liability by ID
		 */
		get: trpc.liability.getClaimLiability.useQuery,

		/**
		 * Get aggregated liability totals for a claim
		 */
		getAggregates: trpc.liability.getClaimLiabilityAggregates.useQuery,

		/**
		 * Get total amount paid for a claim
		 */
		getAmountPaidTotal: trpc.liability.getClaimAmountPaidTotal.useQuery,

		// ====================================================================
		// LIABILITY MUTATION OPERATIONS
		// ====================================================================

		/**
		 * Create claim liability (invalidates party and liability lists)
		 */
		create: trpc.liability.createClaimLiability.useMutation({
			onSuccess(data) {
				// Invalidate all liability-related queries
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimAmountPaidTotal.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new expected_recovery
				if (data.claimId) {
					updateClaimExpectedRecovery(data.claimId, data.expectedRecovery);
				}
			},
		}),

		/**
		 * Update claim liability (invalidates party and liability lists)
		 */
		update: trpc.liability.updateClaimLiability.useMutation({
			onSuccess(data) {
				// Invalidate all liability-related queries
				utils.liability.getClaimLiability.invalidate({ id: data.liability.id });
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimAmountPaidTotal.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new expected_recovery
				if (data.claimId) {
					updateClaimExpectedRecovery(data.claimId, data.expectedRecovery);
				}
			},
		}),

		/**
		 * Delete claim liability (invalidates party and liability lists)
		 */
		delete: trpc.liability.deleteClaimLiability.useMutation({
			onSuccess(data) {
				// Invalidate all liability-related queries
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimAmountPaidTotal.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
				// Update cached claim detail with new expected_recovery
				if (data.claimId) {
					updateClaimExpectedRecovery(data.claimId, data.expectedRecovery);
				}
			},
		}),
	};
}
