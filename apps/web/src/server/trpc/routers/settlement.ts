import { router, protectedProcedure } from '../trpc';
import {
	createSettlement,
	getSettlement,
	listSettlements,
	getSettlementsForDropdown,
	updateSettlement,
	deleteSettlement,
} from '@/api/controllers/settlementController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	createSettlementInput,
	updateSettlementInput,
	deleteSettlementInput,
	listSettlementsInput,
	getSettlementInput,
} from '@/schemas/settlementSchemas';

export const settlementRouter = router({
	// =====================================================================
	// SETTLEMENT ENDPOINTS
	// =====================================================================

	createSettlement: protectedProcedure
		.input(createSettlementInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return createSettlement(ctx, input);
		}),

	getSettlement: protectedProcedure.input(getSettlementInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getSettlement(ctx, input);
	}),

	listSettlements: protectedProcedure.input(listSettlementsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return listSettlements(ctx, input);
	}),

	getSettlementsForDropdown: protectedProcedure
		.input(listSettlementsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return getSettlementsForDropdown(ctx, input);
		}),

	updateSettlement: protectedProcedure
		.input(updateSettlementInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return updateSettlement(ctx, input);
		}),

	deleteSettlement: protectedProcedure
		.input(deleteSettlementInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deleteSettlement(ctx, input);
		}),
});
