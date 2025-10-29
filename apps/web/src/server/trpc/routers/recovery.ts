import { router, protectedProcedure } from '../trpc';
import {
	createRecoveryEvent,
	listRecoveryEvents,
	deleteRecoveryEvent,
	createDeadline,
	listDeadlines,
	updateDeadlineStatus,
	deleteDeadline,
	getRecoveryMetricsSummary,
	getRecoveryMetricsTimeSeries,
} from '@/api/controllers/recoveryController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	createRecoveryEventInput,
	listRecoveryEventsInput,
	deleteRecoveryEventInput,
	createDeadlineInput,
	listDeadlinesInput,
	updateDeadlineStatusInput,
	deleteDeadlineInput,
	getRecoveryMetricsSummaryInput,
	getRecoveryMetricsTimeSeriesInput,
} from '@/schemas/recoverySchemas';

export const recoveryRouter = router({
	// =====================================================================
	// RECOVERY EVENT ENDPOINTS
	// =====================================================================

	createRecoveryEvent: protectedProcedure
		.input(createRecoveryEventInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return createRecoveryEvent(ctx, input);
		}),

	listRecoveryEvents: protectedProcedure
		.input(listRecoveryEventsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return listRecoveryEvents(ctx, input);
		}),

	deleteRecoveryEvent: protectedProcedure
		.input(deleteRecoveryEventInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deleteRecoveryEvent(ctx, input);
		}),

	// =====================================================================
	// DEADLINE ENDPOINTS
	// =====================================================================

	createDeadline: protectedProcedure.input(createDeadlineInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createDeadline(ctx, input);
	}),

	listDeadlines: protectedProcedure.input(listDeadlinesInput).query(async ({ input, ctx }) => {
		// Contributors can view deadlines for claims they're assigned to
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

	// =====================================================================
	// RECOVERY METRICS ENDPOINTS
	// =====================================================================

	getRecoveryMetricsSummary: protectedProcedure
		.input(getRecoveryMetricsSummaryInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return getRecoveryMetricsSummary(ctx, input);
		}),

	getRecoveryMetricsTimeSeries: protectedProcedure
		.input(getRecoveryMetricsTimeSeriesInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return getRecoveryMetricsTimeSeries(ctx, input);
		}),
});
