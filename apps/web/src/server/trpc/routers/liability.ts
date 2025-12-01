import * as liabilityController from '@/api/controllers/liabilityController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getClaimPartyLiabilitiesInput,
	getClaimLiabilitiesInput,
	getClaimLiabilityInput,
	getClaimLiabilityAggregatesInput,
	getClaimRecoveryTotalsInput,
	createClaimLiabilityInput,
	updateClaimLiabilityInput,
	deleteClaimLiabilityInput,
} from '@/schemas/liabilitySchemas';

export const liabilityRouter = router({
	// ========================================================================
	// CLAIM LIABILITY QUERY OPERATIONS
	// ========================================================================

	/**
	 * Get all liabilities for a specific claim_party (Admin + Contributor read access)
	 */
	getClaimPartyLiabilities: protectedProcedure
		.input(getClaimPartyLiabilitiesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimPartyLiabilities(ctx, input);
		}),

	/**
	 * Get all liabilities for a claim (Admin + Contributor read access)
	 */
	getClaimLiabilities: protectedProcedure
		.input(getClaimLiabilitiesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimLiabilities(ctx, input);
		}),

	/**
	 * Get single liability by ID (Admin + Contributor read access)
	 */
	getClaimLiability: protectedProcedure
		.input(getClaimLiabilityInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimLiability(ctx, input);
		}),

	/**
	 * Get aggregated liability totals for a claim (Admin + Contributor read access)
	 */
	getClaimLiabilityAggregates: protectedProcedure
		.input(getClaimLiabilityAggregatesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimLiabilityAggregates(ctx, input);
		}),

	/**
	 * Get recovery totals for a claim (Admin + Contributor read access)
	 * Replaces claim.paid_recovery and claim.reserved_recovery
	 */
	getClaimRecoveryTotals: protectedProcedure
		.input(getClaimRecoveryTotalsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimRecoveryTotals(ctx, input);
		}),

	// ========================================================================
	// CLAIM LIABILITY MUTATION OPERATIONS (Admin only)
	// ========================================================================

	/**
	 * Create claim liability (Admin only)
	 */
	createClaimLiability: protectedProcedure
		.input(createClaimLiabilityInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return liabilityController.createClaimLiability(ctx, input);
		}),

	/**
	 * Update claim liability (Admin only)
	 */
	updateClaimLiability: protectedProcedure
		.input(updateClaimLiabilityInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return liabilityController.updateClaimLiability(ctx, input);
		}),

	/**
	 * Delete claim liability (Admin only)
	 */
	deleteClaimLiability: protectedProcedure
		.input(deleteClaimLiabilityInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return liabilityController.deleteClaimLiability(ctx, input);
		}),
});
