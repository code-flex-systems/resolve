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
				expected_recovery: expectedRecovery.toString(),
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
		 * Create party (invalidates party, address, phone, email, and representative lists)
		 */
		create: trpc.party.createParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Update party (invalidates party, address, phone, email, and representative lists)
		 */
		update: trpc.party.updateParty.useMutation({
			onSuccess({ id }) {
				utils.party.getParties.invalidate();
				utils.party.getParty.invalidate({ id });
				utils.party.getPartyAddresses.invalidate({ partyId: id });
				utils.party.getPartyPhones.invalidate({ partyId: id });
				utils.party.getPartyEmails.invalidate({ partyId: id });
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Archive party (invalidates party, address, and representative lists)
		 */
		archive: trpc.party.archiveParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Restore party (invalidates party, address, and representative lists)
		 */
		restore: trpc.party.restoreParty.useMutation({
			onSuccess() {
				utils.party.getParties.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// ====================================================================
		// PARTY ADDRESS OPERATIONS (renamed from PARTY OFFICE)
		// ====================================================================

		/**
		 * Get addresses for a party
		 */
		listAddresses: trpc.party.getPartyAddresses.useQuery,

		/**
		 * Get all party addresses (for standalone admin tab)
		 */
		listAllAddresses: trpc.party.getAllPartyAddresses.useQuery,

		/**
		 * Get single party address by ID
		 */
		getAddress: trpc.party.getPartyAddress.useQuery,

		/**
		 * Create party address (invalidates address and representative lists)
		 */
		createAddress: trpc.party.createPartyAddress.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyAddresses.invalidate({ partyId: party_id });
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: party_id });
			},
		}),

		/**
		 * Update party address (invalidates address and representative lists)
		 */
		updateAddress: trpc.party.updatePartyAddress.useMutation({
			onSuccess(address) {
				utils.party.getPartyAddresses.invalidate({ partyId: address.party_id });
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: address.party_id });
			},
		}),

		/**
		 * Archive party address (invalidates address and representative lists)
		 */
		archiveAddress: trpc.party.archivePartyAddress.useMutation({
			onSuccess() {
				utils.party.getPartyAddresses.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		/**
		 * Restore party address (invalidates address and representative lists)
		 */
		restoreAddress: trpc.party.restorePartyAddress.useMutation({
			onSuccess() {
				utils.party.getPartyAddresses.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// Legacy aliases for backwards compatibility (Office -> Address)
		listOffices: trpc.party.getPartyOffices.useQuery,
		listAllOffices: trpc.party.getAllPartyOffices.useQuery,
		createOffice: trpc.party.createPartyAddress.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyAddresses.invalidate({ partyId: party_id });
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: party_id });
			},
		}),
		updateOffice: trpc.party.updatePartyAddress.useMutation({
			onSuccess(address) {
				utils.party.getPartyAddresses.invalidate({ partyId: address.party_id });
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
				utils.party.getParty.invalidate({ id: address.party_id });
			},
		}),
		archiveOffice: trpc.party.archivePartyAddress.useMutation({
			onSuccess() {
				utils.party.getPartyAddresses.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),
		restoreOffice: trpc.party.restorePartyAddress.useMutation({
			onSuccess() {
				utils.party.getPartyAddresses.invalidate();
				utils.party.getAllPartyAddresses.invalidate();
				utils.party.getAllPartyRepresentatives.invalidate();
			},
		}),

		// ====================================================================
		// PARTY PHONE OPERATIONS
		// ====================================================================

		/**
		 * Get phones for a party
		 */
		listPhones: trpc.party.getPartyPhones.useQuery,

		/**
		 * Create party phone (invalidates phone lists and party)
		 */
		createPhone: trpc.party.createPartyPhone.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyPhones.invalidate({ partyId: party_id });
				utils.party.getParty.invalidate({ id: party_id });
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Update party phone (invalidates phone lists and party)
		 */
		updatePhone: trpc.party.updatePartyPhone.useMutation({
			onSuccess(phone) {
				utils.party.getPartyPhones.invalidate({ partyId: phone.party_id });
				utils.party.getParty.invalidate({ id: phone.party_id });
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Archive party phone (invalidates phone lists)
		 */
		archivePhone: trpc.party.archivePartyPhone.useMutation({
			onSuccess() {
				utils.party.getPartyPhones.invalidate();
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Restore party phone (invalidates phone lists)
		 */
		restorePhone: trpc.party.restorePartyPhone.useMutation({
			onSuccess() {
				utils.party.getPartyPhones.invalidate();
				utils.party.getParties.invalidate();
			},
		}),

		// ====================================================================
		// PARTY EMAIL OPERATIONS
		// ====================================================================

		/**
		 * Get emails for a party
		 */
		listEmails: trpc.party.getPartyEmails.useQuery,

		/**
		 * Create party email (invalidates email lists and party)
		 */
		createEmail: trpc.party.createPartyEmail.useMutation({
			onSuccess({ party_id }) {
				utils.party.getPartyEmails.invalidate({ partyId: party_id });
				utils.party.getParty.invalidate({ id: party_id });
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Update party email (invalidates email lists and party)
		 */
		updateEmail: trpc.party.updatePartyEmail.useMutation({
			onSuccess(email) {
				utils.party.getPartyEmails.invalidate({ partyId: email.party_id });
				utils.party.getParty.invalidate({ id: email.party_id });
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Archive party email (invalidates email lists)
		 */
		archiveEmail: trpc.party.archivePartyEmail.useMutation({
			onSuccess() {
				utils.party.getPartyEmails.invalidate();
				utils.party.getParties.invalidate();
			},
		}),

		/**
		 * Restore party email (invalidates email lists)
		 */
		restoreEmail: trpc.party.restorePartyEmail.useMutation({
			onSuccess() {
				utils.party.getPartyEmails.invalidate();
				utils.party.getParties.invalidate();
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
		 * Get single party representative by ID
		 */
		getRepresentative: trpc.party.getPartyRepresentative.useQuery,

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
