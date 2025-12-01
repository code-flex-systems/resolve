import { router, protectedProcedure } from '../trpc';
import { getAdminLogsByClaim, getAdminLogsByEntity } from '@/api/queries/adminLogQueries';
import { getAdminLogsByClaimInput, getAdminLogsByEntityInput } from '@/schemas/adminLogSchemas';

export const adminLogsRouter = router({
	getAdminLogsByClaim: protectedProcedure.input(getAdminLogsByClaimInput).query(async ({ input, ctx }) => {
		return getAdminLogsByClaim(ctx, input.claimId, input.limit);
	}),

	getAdminLogsByEntity: protectedProcedure.input(getAdminLogsByEntityInput).query(async ({ input, ctx }) => {
		return getAdminLogsByEntity(ctx, input.entityName, input.entityId, input.limit);
	}),
});
