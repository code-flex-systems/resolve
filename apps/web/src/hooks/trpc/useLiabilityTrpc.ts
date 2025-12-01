import { trpc } from '@/lib/trpc';

/**
 * Custom hook for claim liability management tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 */
export function useLiabilityTrpc() {
	const utils = trpc.useUtils();

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
		 * Get recovery totals for a claim (replaces claim.paid_recovery and claim.reserved_recovery)
		 */
		getRecoveryTotals: trpc.liability.getClaimRecoveryTotals.useQuery,

		// ====================================================================
		// LIABILITY MUTATION OPERATIONS
		// ====================================================================

		/**
		 * Create claim liability (invalidates party and liability lists)
		 */
		create: trpc.liability.createClaimLiability.useMutation({
			onSuccess() {
				// Invalidate all liability-related queries
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimRecoveryTotals.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
			},
		}),

		/**
		 * Update claim liability (invalidates party and liability lists)
		 */
		update: trpc.liability.updateClaimLiability.useMutation({
			onSuccess(data) {
				// Invalidate all liability-related queries
				utils.liability.getClaimLiability.invalidate({ id: data.id });
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimRecoveryTotals.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
			},
		}),

		/**
		 * Delete claim liability (invalidates party and liability lists)
		 */
		delete: trpc.liability.deleteClaimLiability.useMutation({
			onSuccess() {
				// Invalidate all liability-related queries
				utils.liability.getClaimPartyLiabilities.invalidate();
				utils.liability.getClaimLiabilities.invalidate();
				utils.liability.getClaimLiabilityAggregates.invalidate();
				utils.liability.getClaimRecoveryTotals.invalidate();
				// Also invalidate party queries since they now include nested liabilities
				utils.party.getClaimParties.invalidate();
			},
		}),
	};
}
