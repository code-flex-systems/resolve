import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';
import { useFinancialReportingInvalidation } from './useFinancialReportingTrpc';

type RecoveryOutput = RouterOutput['recovery'];

export function useRecoveryTrpc() {
	const utils = trpc.useUtils();
	const reportingInvalidation = useFinancialReportingInvalidation();

	return {
		// Recovery Event hooks
		createRecoveryEvent: trpc.recovery.createRecoveryEvent.useMutation({
			onSuccess(_data, variables) {
				// Invalidate recovery events list for this claim
				utils.recovery.listRecoveryEvents.invalidate({ claimId: variables.claimId });
				utils.recovery.listRecoveryEventsWithFilters.invalidate();
				// Invalidate recovery summary by coverage
				utils.recovery.getRecoverySummaryByCoverage.invalidate({ claimId: variables.claimId });
				// Invalidate recovery metrics as they depend on recovery events
				utils.recovery.getRecoveryMetricsSummary.invalidate();
				utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
				// Invalidate claim detail to update actual_recovery totals
				utils.claim.getClaimDetail.invalidate({ claimId: variables.claimId });
				reportingInvalidation.onRecoveryEventMutate();
			},
		}),

		listRecoveryEvents: trpc.recovery.listRecoveryEvents.useQuery,

		listRecoveryEventsWithFilters: trpc.recovery.listRecoveryEventsWithFilters.useQuery,

		exportRecoveryEvents: trpc.recovery.exportRecoveryEvents.useQuery,

		updateRecoveryEvent: trpc.recovery.updateRecoveryEvent.useMutation({
			onSuccess(_data, variables) {
				// Invalidate recovery events lists for this claim
				utils.recovery.listRecoveryEvents.invalidate({ claimId: variables.claimId });
				utils.recovery.listRecoveryEventsWithFilters.invalidate();
				// Invalidate recovery summary by coverage
				utils.recovery.getRecoverySummaryByCoverage.invalidate({ claimId: variables.claimId });
				// Invalidate recovery metrics as they depend on recovery events
				utils.recovery.getRecoveryMetricsSummary.invalidate();
				utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
				// Invalidate claim detail to update actual_recovery totals
				utils.claim.getClaimDetail.invalidate({ claimId: variables.claimId });
				reportingInvalidation.onRecoveryEventMutate();
			},
		}),

		deleteRecoveryEvent: trpc.recovery.deleteRecoveryEvent.useMutation({
			onSuccess(_data, variables) {
				// Invalidate recovery events list for this claim
				utils.recovery.listRecoveryEvents.invalidate({ claimId: variables.claimId });
				utils.recovery.listRecoveryEventsWithFilters.invalidate();
				// Invalidate recovery summary by coverage
				utils.recovery.getRecoverySummaryByCoverage.invalidate({ claimId: variables.claimId });
				// Invalidate recovery metrics as they depend on recovery events
				utils.recovery.getRecoveryMetricsSummary.invalidate();
				utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
				// Invalidate claim detail to update actual_recovery totals
				utils.claim.getClaimDetail.invalidate({ claimId: variables.claimId });
				reportingInvalidation.onRecoveryEventMutate();
			},
		}),

		// Recovery Summary by Coverage hook
		getRecoverySummaryByCoverage: trpc.recovery.getRecoverySummaryByCoverage.useQuery,

		// Recovery Metrics hooks
		getRecoveryMetricsSummary: trpc.recovery.getRecoveryMetricsSummary.useQuery,

		getRecoveryMetricsTimeSeries: trpc.recovery.getRecoveryMetricsTimeSeries.useQuery,

		getQuarterlyRecoveryStats: trpc.recovery.getQuarterlyRecoveryStats.useQuery,
	};
}

// Export types for use in components
export type RecoveryEvent = RecoveryOutput['listRecoveryEvents'][number];
export type RecoveryEventWithDetails = RecoveryOutput['listRecoveryEventsWithFilters']['rows'][number];
export type RecoverySummaryByCoverage = RecoveryOutput['getRecoverySummaryByCoverage'][number];
export type RecoveryMetricsSummary = RecoveryOutput['getRecoveryMetricsSummary'];
export type RecoveryMetricsTimeSeries = RecoveryOutput['getRecoveryMetricsTimeSeries'];
export type QuarterlyRecoveryStats = RecoveryOutput['getQuarterlyRecoveryStats'];
