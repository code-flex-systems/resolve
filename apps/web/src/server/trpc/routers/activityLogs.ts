import { router, protectedProcedure } from '../trpc';
import {
	getClaimActivityLogs,
	getCompleteClaimTimeline,
	getUserActivityLogs,
	getEntityConfigLogs,
	getRecentConfigLogs,
} from '@/api/queries/activityLogQueries';
import {
	getClaimActivityLogsInput,
	getCompleteClaimTimelineInput,
	getUserActivityLogsInput,
	getEntityConfigLogsInput,
	getRecentConfigLogsInput,
} from '@/schemas/activityLogSchemas';
import config from '@/config/config';

const requireRole = (ctx: any, allowedRoles: string[]) => {
	if (!allowedRoles.includes(ctx.session.user.role)) {
		throw new Error('Unauthorized');
	}
};

export const activityLogsRouter = router({
	// Get claim activity logs (admin + user actions)
	getClaimActivityLogs: protectedProcedure
		.input(getClaimActivityLogsInput)
		.query(async ({ input, ctx }) => {
			return getClaimActivityLogs(ctx, input.claimId, {
				actorType: input.actorType,
				limit: input.limit,
			});
		}),

	// Get complete claim timeline (activity + responses)
	getCompleteClaimTimeline: protectedProcedure
		.input(getCompleteClaimTimelineInput)
		.query(async ({ input, ctx }) => {
			return getCompleteClaimTimeline(ctx, input.claimId, {
				limit: input.limit,
			});
		}),

	// Get user activity logs (requires admin or viewing own logs)
	getUserActivityLogs: protectedProcedure
		.input(getUserActivityLogsInput)
		.query(async ({ input, ctx }) => {
			const userId = input.userId || ctx.session.user.id;

			// Only allow viewing own logs or admin viewing others
			if (userId !== ctx.session.user.id) {
				requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			}

			return getUserActivityLogs(ctx, userId, {
				startDate: input.startDate,
				endDate: input.endDate,
				limit: input.limit,
			});
		}),

	// Get entity config logs (admin only)
	getEntityConfigLogs: protectedProcedure
		.input(getEntityConfigLogsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);

			return getEntityConfigLogs(ctx, input.entityName, input.entityId, {
				limit: input.limit,
			});
		}),

	// Get recent config logs (admin only)
	getRecentConfigLogs: protectedProcedure
		.input(getRecentConfigLogsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);

			return getRecentConfigLogs(ctx, {
				entityName: input.entityName,
				limit: input.limit,
			});
		}),
});
