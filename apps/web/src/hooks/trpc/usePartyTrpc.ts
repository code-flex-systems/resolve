import { trpc } from '@/lib/trpc';

/**
 * Custom hook for party management tRPC operations
 * Provides convenience wrappers with automatic cache invalidation
 */
export function usePartyTrpc() {
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
		// PARTY OPERATIONS
		// ====================================================================

		/**
		 * Get paginated list of parties
		 */
		list: trpc.party.getParties.useQuery,

		/**
		 * Get single party by ID
		 */
		get: trpc.party.getParty.useQuery,

		/**
		 * Search parties for deduplication
		 */
		search: trpc.party.searchParties.useQuery,

		/**
		 * Create party (invalidates party, office, and representative lists)
		 */
		create: trpc.party.createParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Update party (invalidates party, office, and representative lists)
		 */
		update: trpc.party.updateParty.useMutation({
			onSuccess({ id }) {
				utils.party.getParties.invalidate();
				utils.party.getParty.invalidate({ id });
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Archive party (invalidates party, office, and representative lists)
		 */
		archive: trpc.party.archiveParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Restore party (invalidates party, office, and representative lists)
		 */
		restore: trpc.party.restoreParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// ====================================================================
		// PARTY OFFICE OPERATIONS
		// ====================================================================

		/**
		 * Get offices for a party
		 */
		listOffices: trpc.party.getPartyOffices.useQuery,

		/**
		 * Get all party offices (for standalone admin tab)
		 */
		listAllOffices: trpc.party.getAllPartyOffices.useQuery,

		/**
		 * Create party office (invalidates office and representative lists)
		 */
		createOffice: trpc.party.createPartyOffice.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyOffices.invalidate({ partyId: party_id });
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: party_id });
			},
		}),

		/**
		 * Update party office (invalidates office and representative lists)
		 */
		updateOffice: trpc.party.updatePartyOffice.useMutation({
			onSuccess(office) {
				utils.party.getPartyOffices.invalidate({ partyId: office.party_id });
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: office.party_id });
			},
		}),

		/**
		 * Archive party office (invalidates office and representative lists)
		 */
		archiveOffice: trpc.party.archivePartyOffice.useMutation({
			onSuccess() {
				utils.party.getPartyOffices.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Restore party office (invalidates office and representative lists)
		 */
		restoreOffice: trpc.party.restorePartyOffice.useMutation({
			onSuccess() {
				utils.party.getPartyOffices.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Delete party office (invalidates office and representative lists) - Deprecated: use archiveOffice
		 */
		removeOffice: trpc.party.deletePartyOffice.useMutation({
			onSuccess(_, variables) {
				// Need to invalidate all office lists since we don't know party_id from delete response
				utils.party.getPartyOffices.invalidate();
				utils.party.getAllPartyOffices.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// ====================================================================
		// PARTY REPRESENTATIVE OPERATIONS
		// ====================================================================

		/**
		 * Get representatives for a party
		 */
		listRepresentatives: trpc.party.getPartyRepresentatives.useQuery,

		/**
		 * Get all party representatives (for standalone admin tab)
		 */
		listAllRepresentatives: trpc.party.getAllPartyRepresentatives.useQuery,

		/**
		 * Create party representative (invalidates representative lists only)
		 */
		createRepresentative: trpc.party.createPartyRepresentative.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyRepresentatives.invalidate({ partyId: party_id });
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Update party representative (invalidates representative lists only)
		 */
		updateRepresentative: trpc.party.updatePartyRepresentative.useMutation({
			onSuccess(representative) {
				utils.party.getPartyRepresentatives.invalidate({
					partyId: representative.party_id,
				});
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Archive party representative (invalidates representative lists only)
		 */
		archiveRepresentative: trpc.party.archivePartyRepresentative.useMutation({
			onSuccess() {
				utils.party.getPartyRepresentatives.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Restore party representative (invalidates representative lists only)
		 */
		restoreRepresentative: trpc.party.restorePartyRepresentative.useMutation({
			onSuccess() {
				utils.party.getPartyRepresentatives.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Delete party representative (invalidates representative lists only) - Deprecated: use archiveRepresentative
		 */
		removeRepresentative: trpc.party.deletePartyRepresentative.useMutation({
			onSuccess() {
				utils.party.getPartyRepresentatives.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// ====================================================================
		// CLAIM PARTY LINKING OPERATIONS
		// ====================================================================

		/**
		 * Get parties linked to a claim
		 */
		listClaimParties: trpc.party.getClaimParties.useQuery,

		/**
		 * Link party to claim (invalidates claim party list after success)
		 */
		linkToClaim: trpc.party.linkPartyToClaim.useMutation({
			onSuccess(data) {
				utils.party.getClaimParties.invalidate({ claimId: data.claimParty.claim_id });
				// Update cached claim detail with new expected_recovery
				updateClaimExpectedRecovery(data.claimParty.claim_id, data.expectedRecovery);
			},
		}),

		/**
		 * Update claim party relationship (invalidates claim party list after success)
		 */
		updateClaimParty: trpc.party.updateClaimParty.useMutation({
			onSuccess(data) {
				utils.party.getClaimParties.invalidate({ claimId: data.claimParty.claim_id });
				// Update cached claim detail with new expected_recovery
				updateClaimExpectedRecovery(data.claimParty.claim_id, data.expectedRecovery);
			},
		}),

		/**
		 * Archive claim party (soft delete with cascade to facilitators, coverages, liabilities)
		 * Invalidates claim party list and updates expected_recovery after success
		 */
		archiveClaimParty: trpc.party.archiveClaimParty.useMutation({
			onSuccess(data) {
				utils.party.getClaimParties.invalidate({ claimId: data.claimId });
				// Update cached claim detail with new expected_recovery
				updateClaimExpectedRecovery(data.claimId, data.expectedRecovery);
			},
		}),
	};
}
