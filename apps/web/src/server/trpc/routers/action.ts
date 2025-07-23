import { requireRole } from '@/lib/auth/requireRole';
import { protectedProcedure, router } from '../trpc';
import config from '@/config/config';
import { createActionInput, getActionInput } from '@/schemas/actionSchemas';
import { getAction, upsertAction } from '@/api/controllers/actionController';

export const actionRouter = router({
	getAction: protectedProcedure.input(getActionInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getAction(ctx, input);
	}),

	upsertAction: protectedProcedure.input(createActionInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return upsertAction(ctx, input);
	}),
});
