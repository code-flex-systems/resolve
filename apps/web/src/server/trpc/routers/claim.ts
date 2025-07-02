import { router, protectedProcedure } from '../trpc';

import { createClaims, getClaim, getClaimCount, getClaims } from '@/api/controllers/claimController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import { createClaimInput, getClaimCountInput, getClaimInput, getClaimsInput } from '@/schemas/claimSchemas';

export const claimRouter = router({
	getClaim: protectedProcedure.input(getClaimInput).query(async ({ input, ctx }) => {
		return getClaim(ctx, input);
	}),

	getClaims: protectedProcedure.input(getClaimsInput).query(async ({ input, ctx }) => {
		return getClaims(ctx, input);
	}),

	getClaimCount: protectedProcedure.input(getClaimCountInput).query(async ({ input, ctx }) => {
		// Client aliasing requires Super Admin role
		if (input.clientId) requireRole(ctx, config.ROLES.SUPER_ADMIN);
		return await getClaimCount(ctx, { clientId: input.clientId ?? ctx.session.user.client_id! });
	}),

	createClaims: protectedProcedure.input(createClaimInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createClaims(ctx, input);
	}),
});
