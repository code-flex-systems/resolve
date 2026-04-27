import { router, protectedProcedure } from '../trpc';

import {
	getChecklists,
	getChecklist,
	getChecklistClaim,
	getRecentChecklistClaims,
	getChecklistRecentActivity,
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
	exportChecklistClaims,
} from '@/api/controllers/checklistController';
import {
	createChecklistInput,
	deleteChecklistInput,
	getChecklistClaimInput,
	getChecklistClaimProgressInput,
	getChecklistClaimsInput,
	exportChecklistClaimsInput,
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
import { requireOwnership } from '@/lib/auth/requireOwnership';

export const checklistRouter = router({
	getChecklists: protectedProcedure.input(getChecklistsInput).query(async ({ input, ctx }) => {
		return await getChecklists(ctx, input);
	}),

	getChecklistCount: protectedProcedure.input(getChecklistCountInput).query(async ({ input, ctx }) => {
		if (input.clientId) {
			// Client aliasing requires Super Admin role
			requireRole(ctx, config.ROLES.SUPER_ADMIN);
		} else {
			// Viewing checklist counts is an admin-only operation
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
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
		if (!!input.checklistId || input.users?.length !== 1 || input.users[0] !== ctx.session.user.id) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		return await getChecklistClaimStats(ctx, input);
	}),

	getChecklistClaims: protectedProcedure.input(getChecklistClaimsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return await getChecklistClaims(ctx, input);
	}),

	exportChecklistClaims: protectedProcedure.input(exportChecklistClaimsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return await exportChecklistClaims(ctx, input);
	}),

	getRecentChecklistClaims: protectedProcedure.query(async ({ ctx }) => {
		return await getRecentChecklistClaims(ctx);
	}),

	getChecklistRecentActivity: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return getChecklistRecentActivity(ctx);
	}),

	getChecklistSummary: protectedProcedure.input(getChecklistSummaryInput).query(async ({ input, ctx }) => {
		if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
			await requireOwnership(ctx, input.checklistId, input.claimId);
		}
		return await getChecklistSummary(ctx, input);
	}),

	getChecklistSummaryDetail: protectedProcedure
		.input(getChecklistSummaryDetailInput)
		.query(async ({ input, ctx }) => {
			if (!checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN])) {
				await requireOwnership(ctx, input.checklistId, input.claimId);
			}
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
