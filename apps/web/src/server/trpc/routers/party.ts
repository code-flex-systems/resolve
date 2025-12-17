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
	getPartyOfficesInput,
	getAllPartyOfficesInput,
	createPartyOfficeInput,
	updatePartyOfficeInput,
	archivePartyOfficeInput,
	deletePartyOfficeInput,
	getPartyRepresentativesInput,
	getAllPartyRepresentativesInput,
	createPartyRepresentativeInput,
	updatePartyRepresentativeInput,
	archivePartyRepresentativeInput,
	restorePartyRepresentativeInput,
	deletePartyRepresentativeInput,
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
	// PARTY OFFICE CRUD OPERATIONS
	// ========================================================================

	/**
	 * Get offices for a party (Admin + Contributor read access)
	 */
	getPartyOffices: protectedProcedure
		.input(getPartyOfficesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getPartyOffices(ctx, input);
		}),

	/**
	 * Get all party offices (Admin + Contributor read access)
	 */
	getAllPartyOffices: protectedProcedure
		.input(getAllPartyOfficesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.getAllPartyOffices(ctx, input);
		}),

	/**
	 * Create party office (Admin + Contributor)
	 */
	createPartyOffice: protectedProcedure
		.input(createPartyOfficeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.createPartyOffice(ctx, input);
		}),

	/**
	 * Update party office (Admin + Contributor)
	 */
	updatePartyOffice: protectedProcedure
		.input(updatePartyOfficeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return partyController.updatePartyOffice(ctx, input);
		}),

	/**
	 * Archive party office (Admin only)
	 */
	archivePartyOffice: protectedProcedure
		.input(archivePartyOfficeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyOffice(ctx, input);
		}),

	/**
	 * Restore party office (Admin only)
	 */
	restorePartyOffice: protectedProcedure
		.input(archivePartyOfficeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.restorePartyOffice(ctx, input);
		}),

	/**
	 * Delete party office (Admin only) - Deprecated: use archivePartyOffice
	 */
	deletePartyOffice: protectedProcedure
		.input(deletePartyOfficeInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archivePartyOffice(ctx, input);
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
	 * Archive claim party (soft delete) with cascade to facilitators, coverages, and liabilities (Admin only)
	 */
	archiveClaimParty: protectedProcedure
		.input(unlinkPartyFromClaimInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return partyController.archiveClaimParty(ctx, input);
		}),
});
