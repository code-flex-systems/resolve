import { router, protectedProcedure } from '../trpc';

import { createClaims, getClaim, getClaims } from '@/api/controllers/claimController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import { createClaimInput, getClaimInput, getClaimsInput } from '@/schemas/claimSchemas';

export const claimRouter = router({
	getClaim: protectedProcedure.input(getClaimInput).query(async ({ input, ctx }) => {
		return getClaim(ctx, input);
	}),

	getClaims: protectedProcedure.input(getClaimsInput).query(async ({ input, ctx }) => {
		return getClaims(ctx, input);
	}),

	createClaims: protectedProcedure.input(createClaimInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createClaims(ctx, input);
	}),
});
