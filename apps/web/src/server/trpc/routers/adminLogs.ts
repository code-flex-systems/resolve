import { router, protectedProcedure } from '../trpc';
import { getAdminLogsByClaim, getAdminLogsByEntity } from '@/api/queries/adminLogQueries';
import { getAdminLogsByClaimInput, getAdminLogsByEntityInput, listAdminConfigLogsInput } from '@/schemas/adminLogSchemas';
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
});
