import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type RecoveryOutput = RouterOutput['recovery'];

export function useRecoveryTrpc() {
	const utils = trpc.useUtils();

	return {
		// Recovery Event hooks
		createRecoveryEvent: trpc.recovery.createRecoveryEvent.useMutation({
			onSuccess(_data, variables) {
				// Invalidate recovery events list for this claim
				utils.recovery.listRecoveryEvents.invalidate({ claimId: variables.claimId });
				utils.recovery.listRecoveryEventsWithFilters.invalidate();
				// Invalidate recovery metrics as they depend on recovery events
				utils.recovery.getRecoveryMetricsSummary.invalidate();
				utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
				// Invalidate claim detail to update actual_recovery totals
				utils.claim.getClaimDetail.invalidate({ claimId: variables.claimId });
			},
		}),

		listRecoveryEvents: trpc.recovery.listRecoveryEvents.useQuery,

		listRecoveryEventsWithFilters: trpc.recovery.listRecoveryEventsWithFilters.useQuery,

		exportRecoveryEvents: trpc.recovery.exportRecoveryEvents.useQuery,

		deleteRecoveryEvent: trpc.recovery.deleteRecoveryEvent.useMutation({
			onSuccess(_data, variables) {
				// Invalidate recovery events list for this claim
				utils.recovery.listRecoveryEvents.invalidate({ claimId: variables.claimId });
				utils.recovery.listRecoveryEventsWithFilters.invalidate();
				// Invalidate recovery metrics as they depend on recovery events
				utils.recovery.getRecoveryMetricsSummary.invalidate();
				utils.recovery.getRecoveryMetricsTimeSeries.invalidate();
				// Invalidate claim detail to update actual_recovery totals
				utils.claim.getClaimDetail.invalidate({ claimId: variables.claimId });
			},
		}),

		// Recovery Metrics hooks
		getRecoveryMetricsSummary: trpc.recovery.getRecoveryMetricsSummary.useQuery,

		getRecoveryMetricsTimeSeries: trpc.recovery.getRecoveryMetricsTimeSeries.useQuery,

		getQuarterlyRecoveryStats: trpc.recovery.getQuarterlyRecoveryStats.useQuery,
	};
}

// Export types for use in components
export type RecoveryEvent = RecoveryOutput['listRecoveryEvents'][number];
export type RecoveryEventWithDetails = RecoveryOutput['listRecoveryEventsWithFilters']['rows'][number];
export type RecoveryMetricsSummary = RecoveryOutput['getRecoveryMetricsSummary'];
export type RecoveryMetricsTimeSeries = RecoveryOutput['getRecoveryMetricsTimeSeries'];
export type QuarterlyRecoveryStats = RecoveryOutput['getQuarterlyRecoveryStats'];
