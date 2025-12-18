import { router, protectedProcedure } from '../trpc';
import {
	createDeadline,
	listDeadlines,
	updateDeadlineStatus,
	deleteDeadline,
} from '@/api/controllers/deadlineController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	createDeadlineInput,
	listDeadlinesInput,
	updateDeadlineStatusInput,
	deleteDeadlineInput,
} from '@/schemas/deadlineSchemas';

export const deadlineRouter = router({
	// =====================================================================
	// DEADLINE ENDPOINTS
	// =====================================================================

	createDeadline: protectedProcedure.input(createDeadlineInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		const { claimId, ...params } = input;
		return createDeadline(ctx, { claimId, params });
	}),

	listDeadlines: protectedProcedure.input(listDeadlinesInput).query(async ({ input, ctx }) => {
		// Require Admin/Super Admin role if not filtering by personal deadlines
		if (!input.personalOnly) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		return listDeadlines(ctx, input);
	}),

	updateDeadlineStatus: protectedProcedure
		.input(updateDeadlineStatusInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return updateDeadlineStatus(ctx, input);
		}),

	deleteDeadline: protectedProcedure.input(deleteDeadlineInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteDeadline(ctx, input);
	}),
});
