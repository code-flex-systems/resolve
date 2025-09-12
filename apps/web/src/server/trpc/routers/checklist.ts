import { router, protectedProcedure } from '../trpc';

import {
	getChecklists,
	getChecklist,
	getChecklistClaim,
	getRecentChecklistClaims,
	getChecklistSummary,
	getChecklistSummaryDetail,
	createChecklist,
	deleteChecklist,
	modifyChecklist,
	getChecklistCount,
	getChecklistClaimStats,
	modifyChecklistClaim,
	getChecklistClaimProgress,
	getChecklistClaims,
} from '@/api/controllers/checklistController';
import {
	createChecklistInput,
	deleteChecklistInput,
	getChecklistClaimInput,
	getChecklistClaimProgressInput,
	getChecklistClaimsInput,
	getChecklistClaimStatsInput,
	getChecklistCountInput,
	getChecklistInput,
	getChecklistsInput,
	getChecklistSummaryDetailInput,
	getChecklistSummaryInput,
	modifyChecklistClaimInput,
	modifyChecklistInput,
} from '@/schemas/checklistSchemas';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { checkRole } from '@/lib/auth/checkRole';
import { requireAssigned } from '@/lib/auth/requireAssigned';

export const checklistRouter = router({
	getChecklists: protectedProcedure.input(getChecklistsInput).query(async ({ input, ctx }) => {
		return await getChecklists(ctx, input);
	}),

	getChecklistCount: protectedProcedure.input(getChecklistCountInput).query(async ({ input, ctx }) => {
		// Client aliasing requires Super Admin role
		if (input.clientId) requireRole(ctx, config.ROLES.SUPER_ADMIN);
		return await getChecklistCount(ctx, { clientId: input.clientId ?? ctx.session.user.client_id! });
	}),

	getChecklist: protectedProcedure.input(getChecklistInput).query(async ({ input, ctx }) => {
		return await getChecklist(ctx, input);
	}),

	getChecklistClaim: protectedProcedure.input(getChecklistClaimInput).query(async ({ input, ctx }) => {
		return await getChecklistClaim(ctx, input);
	}),

	getChecklistClaimProgress: protectedProcedure
		.input(getChecklistClaimProgressInput)
		.query(async ({ input, ctx }) => {
			return await getChecklistClaimProgress(ctx, input);
		}),

	getChecklistClaimStats: protectedProcedure.input(getChecklistClaimStatsInput).query(async ({ ctx, input }) => {
		if (!!input.checklistId || input.users?.length !== 1 || input.users[0] !== ctx.session.user.email) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		return await getChecklistClaimStats(ctx, input);
	}),

	getChecklistClaims: protectedProcedure.input(getChecklistClaimsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return await getChecklistClaims(ctx, input);
	}),

	getRecentChecklistClaims: protectedProcedure.query(async ({ ctx }) => {
		return await getRecentChecklistClaims(ctx);
	}),

	getChecklistSummary: protectedProcedure.input(getChecklistSummaryInput).query(async ({ input, ctx }) => {
		return await getChecklistSummary(ctx, input);
	}),

	getChecklistSummaryDetail: protectedProcedure
		.input(getChecklistSummaryDetailInput)
		.query(async ({ input, ctx }) => {
			return await getChecklistSummaryDetail(ctx, input);
		}),

	createChecklist: protectedProcedure.input(createChecklistInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return await createChecklist(ctx, input);
	}),

	deleteChecklist: protectedProcedure.input(deleteChecklistInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return await deleteChecklist(ctx, input);
	}),

	updateChecklist: protectedProcedure.input(modifyChecklistInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return modifyChecklist(ctx, input);
	}),

	updateChecklistClaim: protectedProcedure.input(modifyChecklistClaimInput).mutation(async ({ input, ctx }) => {
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireAssigned(ctx, input.checklistId, input.claimId);
		}
		return modifyChecklistClaim(ctx, input);
	}),
});
