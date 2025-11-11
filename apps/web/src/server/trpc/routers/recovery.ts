import { router, protectedProcedure } from '../trpc';
import {
	createRecoveryEvent,
	listRecoveryEvents,
	listRecoveryEventsWithFilters,
	deleteRecoveryEvent,
	exportRecoveryEvents,
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
	listRecoveryEventsWithFiltersInput,
	deleteRecoveryEventInput,
	exportRecoveryEventsInput,
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

	listRecoveryEventsWithFilters: protectedProcedure
		.input(listRecoveryEventsWithFiltersInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return listRecoveryEventsWithFilters(ctx, input);
		}),

	deleteRecoveryEvent: protectedProcedure
		.input(deleteRecoveryEventInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return deleteRecoveryEvent(ctx, input);
		}),

	exportRecoveryEvents: protectedProcedure
		.input(exportRecoveryEventsInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return exportRecoveryEvents(ctx, input);
		}),

	// =====================================================================
	// DEADLINE ENDPOINTS
	// =====================================================================

	createDeadline: protectedProcedure.input(createDeadlineInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createDeadline(ctx, input);
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
