import * as partyController from '@/api/controllers/partyController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getPartiesInput,
	getPartyInput,
	searchPartiesInput,
	createPartyInput,
	updatePartyInput,
	deletePartyInput,
	// Address schemas (renamed from Office)
	getPartyAddressesInput,
	getAllPartyAddressesInput,
	getPartyAddressInput,
	createPartyAddressInput,
	updatePartyAddressInput,
	archivePartyAddressInput,
	restorePartyAddressInput,
	// Phone schemas
	getPartyPhonesInput,
	createPartyPhoneInput,
	updatePartyPhoneInput,
	archivePartyPhoneInput,
	restorePartyPhoneInput,
	// Email schemas
	getPartyEmailsInput,
	createPartyEmailInput,
	updatePartyEmailInput,
	archivePartyEmailInput,
	restorePartyEmailInput,
	// Representative schemas
	getPartyRepresentativesInput,
	getAllPartyRepresentativesInput,
	createPartyRepresentativeInput,
	updatePartyRepresentativeInput,
	archivePartyRepresentativeInput,
	restorePartyRepresentativeInput,
	deletePartyRepresentativeInput,
	// Claim party schemas
	getClaimPartiesInput,
	linkPartyToClaimInput,
	updateClaimPartyInput,
	unlinkPartyFromClaimInput,
} from '@/schemas/partySchemas';

export const partyRouter = router({
	// ========================================================================
	// PARTY CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get paginated list of parties (Admin + Contributor read access)
	 */
	getParties: protectedProcedure
		.input(getPartiesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getParties(ctx, input);
		}),

	/**
	 * Get single party by ID (Admin + Contributor read access)
	 */
	getParty: protectedProcedure
		.input(getPartyInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getParty(ctx, input);
		}),

	/**
	 * Search parties for deduplication (Admin + Contributor read access)
	 */
	searchParties: protectedProcedure
		.input(searchPartiesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.searchParties(ctx, input);
		}),

	/**
	 * Create party (Admin + Contributor)
	 */
	createParty: protectedProcedure
		.input(createPartyInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createParty(ctx, input);
		}),

	/**
	 * Update party (Admin + Contributor)
	 */
	updateParty: protectedProcedure
		.input(updatePartyInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updateParty(ctx, input);
		}),

	/**
	 * Archive party (Admin only)
	 */
	archiveParty: protectedProcedure
		.input(deletePartyInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archiveParty(ctx, input);
		}),

	/**
	 * Restore party (Admin only)
	 */
	restoreParty: protectedProcedure
		.input(deletePartyInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restoreParty(ctx, input);
		}),

	// ========================================================================
	// PARTY ADDRESS CRUD OPERATIONS (renamed from PARTY OFFICE)
	// ========================================================================

	/**
	 * Get addresses for a party (Admin + Contributor read access)
	 */
	getPartyAddresses: protectedProcedure
		.input(getPartyAddressesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyAddresses(ctx, input);
		}),

	/**
	 * Get all party addresses (Admin + Contributor read access)
	 */
	getAllPartyAddresses: protectedProcedure
		.input(getAllPartyAddressesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getAllPartyAddresses(ctx, input);
		}),

	/**
	 * Get single party address by ID (Admin + Contributor read access)
	 */
	getPartyAddress: protectedProcedure
		.input(getPartyAddressInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyAddress(ctx, input);
		}),

	/**
	 * Create party address (Admin + Contributor)
	 */
	createPartyAddress: protectedProcedure
		.input(createPartyAddressInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createPartyAddress(ctx, input);
		}),

	/**
	 * Update party address (Admin + Contributor)
	 */
	updatePartyAddress: protectedProcedure
		.input(updatePartyAddressInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updatePartyAddress(ctx, input);
		}),

	/**
	 * Archive party address (Admin only)
	 */
	archivePartyAddress: protectedProcedure
		.input(archivePartyAddressInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyAddress(ctx, input);
		}),

	/**
	 * Restore party address (Admin only)
	 */
	restorePartyAddress: protectedProcedure
		.input(restorePartyAddressInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restorePartyAddress(ctx, input);
		}),

	// Legacy aliases for backwards compatibility (Office -> Address)
	getPartyOffices: protectedProcedure
		.input(getPartyAddressesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyAddresses(ctx, input);
		}),

	getAllPartyOffices: protectedProcedure
		.input(getAllPartyAddressesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getAllPartyAddresses(ctx, input);
		}),

	// ========================================================================
	// PARTY PHONE CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get phones for a party (Admin + Contributor read access)
	 */
	getPartyPhones: protectedProcedure
		.input(getPartyPhonesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyPhones(ctx, input);
		}),

	/**
	 * Create party phone (Admin + Contributor)
	 */
	createPartyPhone: protectedProcedure
		.input(createPartyPhoneInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createPartyPhone(ctx, input);
		}),

	/**
	 * Update party phone (Admin + Contributor)
	 */
	updatePartyPhone: protectedProcedure
		.input(updatePartyPhoneInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updatePartyPhone(ctx, input);
		}),

	/**
	 * Archive party phone (Admin only)
	 */
	archivePartyPhone: protectedProcedure
		.input(archivePartyPhoneInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyPhone(ctx, input);
		}),

	/**
	 * Restore party phone (Admin only)
	 */
	restorePartyPhone: protectedProcedure
		.input(restorePartyPhoneInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restorePartyPhone(ctx, input);
		}),

	// ========================================================================
	// PARTY EMAIL CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get emails for a party (Admin + Contributor read access)
	 */
	getPartyEmails: protectedProcedure
		.input(getPartyEmailsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyEmails(ctx, input);
		}),

	/**
	 * Create party email (Admin + Contributor)
	 */
	createPartyEmail: protectedProcedure
		.input(createPartyEmailInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createPartyEmail(ctx, input);
		}),

	/**
	 * Update party email (Admin + Contributor)
	 */
	updatePartyEmail: protectedProcedure
		.input(updatePartyEmailInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updatePartyEmail(ctx, input);
		}),

	/**
	 * Archive party email (Admin only)
	 */
	archivePartyEmail: protectedProcedure
		.input(archivePartyEmailInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyEmail(ctx, input);
		}),

	/**
	 * Restore party email (Admin only)
	 */
	restorePartyEmail: protectedProcedure
		.input(restorePartyEmailInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restorePartyEmail(ctx, input);
		}),

	// ========================================================================
	// PARTY REPRESENTATIVE CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get representatives for a party (Admin + Contributor read access)
	 */
	getPartyRepresentatives: protectedProcedure
		.input(getPartyRepresentativesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyRepresentatives(ctx, input);
		}),

	/**
	 * Get all party representatives (Admin + Contributor read access)
	 */
	getAllPartyRepresentatives: protectedProcedure
		.input(getAllPartyRepresentativesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getAllPartyRepresentatives(ctx, input);
		}),

	/**
	 * Get single party representative by ID (Admin + Contributor read access)
	 */
	getPartyRepresentative: protectedProcedure
		.input(getPartyInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyRepresentative(ctx, input);
		}),

	/**
	 * Create party representative (Admin + Contributor)
	 */
	createPartyRepresentative: protectedProcedure
		.input(createPartyRepresentativeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createPartyRepresentative(ctx, input);
		}),

	/**
	 * Update party representative (Admin + Contributor)
	 */
	updatePartyRepresentative: protectedProcedure
		.input(updatePartyRepresentativeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updatePartyRepresentative(ctx, input);
		}),

	/**
	 * Archive party representative (Admin only)
	 */
	archivePartyRepresentative: protectedProcedure
		.input(archivePartyRepresentativeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyRepresentative(ctx, input);
		}),

	/**
	 * Restore party representative (Admin only)
	 */
	restorePartyRepresentative: protectedProcedure
		.input(restorePartyRepresentativeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restorePartyRepresentative(ctx, input);
		}),

	/**
	 * Delete party representative (Admin only) - Deprecated: use archivePartyRepresentative
	 */
	deletePartyRepresentative: protectedProcedure
		.input(deletePartyRepresentativeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyRepresentative(ctx, input);
		}),

	// ========================================================================
	// CLAIM PARTY LINKING OPERATIONS
	// ========================================================================

	/**
	 * Get parties linked to a claim (Admin + Contributor read access)
	 */
	getClaimParties: protectedProcedure
		.input(getClaimPartiesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getClaimParties(ctx, input);
		}),

	/**
	 * Link party to claim (Admin only)
	 */
	linkPartyToClaim: protectedProcedure
		.input(linkPartyToClaimInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.linkPartyToClaim(ctx, input);
		}),

	/**
	 * Update claim party relationship (Admin only)
	 */
	updateClaimParty: protectedProcedure
		.input(updateClaimPartyInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.updateClaimParty(ctx, input);
		}),

	/**
	 * Get party management overview stats (Admin only)
	 */
	getManagementStats: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return partyController.getPartyManagementStats(ctx);
	}),

	/**
	 * Archive claim party (soft delete) with cascade to facilitators, coverages, and liabilities (Admin only)
	 */
	archiveClaimParty: protectedProcedure
		.input(unlinkPartyFromClaimInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archiveClaimParty(ctx, input);
		}),
});
