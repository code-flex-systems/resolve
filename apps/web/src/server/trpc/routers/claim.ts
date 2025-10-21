import { router, protectedProcedure } from '../trpc';

import {
	assignClaim,
	createClaims,
	getClaim,
	getClaimCount,
	getClaims,
	getNextClaimToAssign,
	getRolloverClaimCount,
} from '@/api/controllers/claimController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	assignClaimInput,
	createClaimInput,
	getClaimCountInput,
	getClaimInput,
	getClaimsInput,
	getNextClaimToAssignInput,
} from '@/schemas/claimSchemas';

export const claimRouter = router({
	assignClaim: protectedProcedure.input(assignClaimInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return assignClaim(ctx, input);
	}),

	getClaim: protectedProcedure.input(getClaimInput).query(async ({ input, ctx }) => {
		return getClaim(ctx, input);
	}),

	getNextClaimToAssign: protectedProcedure.input(getNextClaimToAssignInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getNextClaimToAssign(ctx, input);
	}),

	getClaims: protectedProcedure.input(getClaimsInput).query(async ({ input, ctx }) => {
		return getClaims(ctx, input);
	}),

	getClaimCount: protectedProcedure.input(getClaimCountInput).query(async ({ input, ctx }) => {
		// Client aliasing requires Super Admin role
		if (input.clientId) {
			requireRole(ctx, config.ROLES.SUPER_ADMIN);
		}
		return await getClaimCount(ctx, { clientId: input.clientId ?? ctx.session.user.client_id! });
	}),

	getRolloverClaimCount: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getRolloverClaimCount(ctx);
	}),

	createClaims: protectedProcedure.input(createClaimInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createClaims(ctx, input);
	}),
});
