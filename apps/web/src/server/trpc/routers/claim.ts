import { TRPCError } from '@trpc/server';
import { router, protectedProcedure } from '../trpc';

import {
	assignClaim,
	createClaims,
	updateClaim,
	getClaim,
	getClaimCount,
	getClaims,
	getClaimDetail,
	getClaimStatusBreakdown,
	getNextClaimToAssign,
	getRolloverClaimCount,
	listMyClaims,
	listMyDeskClaims,
} from '@/api/controllers/claimController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	assignClaimInput,
	createClaimInput,
	updateClaimInput,
	getClaimCountInput,
	getClaimDetailInput,
	getClaimInput,
	getClaimsInput,
	getNextClaimToAssignInput,
	listMyClaimsInput,
	listMyDeskClaimsInput,
} from '@/schemas/claimSchemas';

export const claimRouter = router({
	assignClaim: protectedProcedure.input(assignClaimInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return assignClaim(ctx, input);
	}),

	getClaim: protectedProcedure.input(getClaimInput).query(async ({ input, ctx }) => {
		return getClaim(ctx, input);
	}),

	getClaimDetail: protectedProcedure.input(getClaimDetailInput).query(async ({ input, ctx }) => {
		return getClaimDetail(ctx, input);
	}),

	getNextClaimToAssign: protectedProcedure
		.input(getNextClaimToAssignInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return getNextClaimToAssign(ctx, input);
		}),

	getClaims: protectedProcedure.input(getClaimsInput).query(async ({ input, ctx }) => {
		return getClaims(ctx, input);
	}),

	getClaimCount: protectedProcedure.input(getClaimCountInput).query(async ({ input, ctx }) => {
		if (input.clientId) {
			// Client aliasing requires Super Admin role
			requireRole(ctx, config.ROLES.SUPER_ADMIN);
		} else {
			// Viewing claim counts is an admin-only operation
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
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

	updateClaim: protectedProcedure.input(updateClaimInput).mutation(async ({ input, ctx }) => {
		const isAdmin =
			ctx.session.user.role === config.ROLES.ADMIN ||
			ctx.session.user.role === config.ROLES.SUPER_ADMIN;

		// Restricted fields that only admins can update
		const hasRestrictedFields =
			input.claim_number !== undefined ||
			input.recovery_status !== undefined ||
			input.substatus !== undefined;

		if (hasRestrictedFields && !isAdmin) {
			throw new TRPCError({
				code: 'FORBIDDEN',
				message: 'Only admins can update claim_number, recovery_status, or substatus',
			});
		}

		return updateClaim(ctx, input);
	}),

	listMyClaims: protectedProcedure.input(listMyClaimsInput).query(async ({ input, ctx }) => {
		return listMyClaims(ctx, input);
	}),

	listMyDeskClaims: protectedProcedure
		.input(listMyDeskClaimsInput)
		.query(async ({ input, ctx }) => {
			return listMyDeskClaims(ctx, input);
		}),

	getClaimStatusBreakdown: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getClaimStatusBreakdown(ctx);
	}),
});
