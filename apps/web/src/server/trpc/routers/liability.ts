import * as liabilityController from '@/api/controllers/liabilityController';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';
import {
	getClaimPartyLiabilitiesInput,
	getClaimLiabilitiesInput,
	getClaimLiabilityInput,
	getClaimLiabilityAggregatesInput,
	getClaimAmountPaidTotalInput,
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
	 * Get total amount paid for a claim (Admin + Contributor read access)
	 * Returns sum of claim_liability.amount_paid
	 */
	getClaimAmountPaidTotal: protectedProcedure
		.input(getClaimAmountPaidTotalInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [
				config.ROLES.CONTRIBUTOR,
				config.ROLES.ADMIN,
				config.ROLES.SUPER_ADMIN,
			]);
			return liabilityController.getClaimAmountPaidTotal(ctx, input);
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
