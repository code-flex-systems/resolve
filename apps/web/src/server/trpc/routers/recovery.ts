import { router, protectedProcedure } from '../trpc';
import {
	createRecoveryEvent,
	listRecoveryEvents,
	listRecoveryEventsWithFilters,
	updateRecoveryEvent,
	deleteRecoveryEvent,
	exportRecoveryEvents,
	getRecoverySummaryByCoverage,
	getRecoveryMetricsSummary,
	getRecoveryMetricsTimeSeries,
	getQuarterlyRecoveryStats,
} from '@/api/controllers/recoveryController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	createRecoveryEventInput,
	listRecoveryEventsInput,
	listRecoveryEventsWithFiltersInput,
	updateRecoveryEventInput,
	deleteRecoveryEventInput,
	exportRecoveryEventsInput,
	getRecoverySummaryByCoverageInput,
	getRecoveryMetricsSummaryInput,
	getRecoveryMetricsTimeSeriesInput,
	getQuarterlyRecoveryStatsInput,
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

	updateRecoveryEvent: protectedProcedure
		.input(updateRecoveryEventInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return updateRecoveryEvent(ctx, input);
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
	// RECOVERY SUMMARY BY COVERAGE
	// =====================================================================

	getRecoverySummaryByCoverage: protectedProcedure
		.input(getRecoverySummaryByCoverageInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return getRecoverySummaryByCoverage(ctx, input);
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

	getQuarterlyRecoveryStats: protectedProcedure
		.input(getQuarterlyRecoveryStatsInput)
		.query(async ({ input, ctx }) => {
			// No role requirement - all users can see quarterly stats for their client
			return getQuarterlyRecoveryStats(ctx, input);
		}),
});
