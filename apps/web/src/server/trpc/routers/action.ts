import { requireRole } from '@/lib/auth/requireRole';
import { protectedProcedure, router } from '../trpc';
import config from '@/config/config';
import { createActionInput, getActionInput, getActionStatsDetailInput } from '@/schemas/actionSchemas';
import { getAction, getActionStats, getActionStatsDetail, upsertAction } from '@/api/controllers/actionController';

export const actionRouter = router({
	getAction: protectedProcedure.input(getActionInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getAction(ctx, input);
	}),

	getActionStats: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getActionStats(ctx);
	}),

	getActionStatsDetail: protectedProcedure.input(getActionStatsDetailInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getActionStatsDetail(ctx, input);
	}),

	upsertAction: protectedProcedure.input(createActionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return upsertAction(ctx, input);
	}),
});
