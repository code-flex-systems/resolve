import { router, protectedProcedure } from '../trpc';
import { getAdminLogsByClaim, getAdminLogsByEntity, getSystemStats } from '@/api/queries/adminLogQueries';
import { listClaimActivityLogs } from '@/api/queries/activityLogQueries';
import {
	getAdminLogsByClaimInput,
	getAdminLogsByEntityInput,
	listAdminConfigLogsInput,
	listClaimActivityLogsInput,
} from '@/schemas/adminLogSchemas';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { getAdminConfigLogs } from '@/api/controllers/adminLogController';

export const adminLogsRouter = router({
	getAdminLogsByClaim: protectedProcedure.input(getAdminLogsByClaimInput).query(async ({ input, ctx }) => {
		return getAdminLogsByClaim(ctx, input.claimId, input.limit);
	}),

	getAdminLogsByEntity: protectedProcedure.input(getAdminLogsByEntityInput).query(async ({ input, ctx }) => {
		return getAdminLogsByEntity(ctx, input.entityName, input.entityId, input.limit);
	}),

	listAdminConfigLogs: protectedProcedure.input(listAdminConfigLogsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getAdminConfigLogs(ctx, input);
	}),

	listClaimActivityLogs: protectedProcedure.input(listClaimActivityLogsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return listClaimActivityLogs(ctx, input);
	}),

	getSystemStats: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getSystemStats(ctx);
	}),
});
