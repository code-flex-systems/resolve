import { trpc } from '@/lib/trpc';
import type { RouterOutput } from '@/types/routerTypes';

type FinancialReportingOutput = RouterOutput['financialReporting'];

// Cache tiers per query (see financialReportingQueries.ts for rationale)
const SHORT = { staleTime: 5 * 60 * 1000, gcTime: 15 * 60 * 1000 } as const;
const MEDIUM = { staleTime: 15 * 60 * 1000, gcTime: 30 * 60 * 1000 } as const;
const LONG = { staleTime: 30 * 60 * 1000, gcTime: 60 * 60 * 1000 } as const;

export function useFinancialReportingTrpc() {
	return {
		// SHORT tier (5 min stale) — operational dashboards
		getRecoveryAgingBreakdown: trpc.financialReporting.getRecoveryAgingBreakdown.useQuery,
		getSettlementFunnel: trpc.financialReporting.getSettlementFunnel.useQuery,
		getStatuteDeadlineRisk: trpc.financialReporting.getStatuteDeadlineRisk.useQuery,

		// MEDIUM tier (15 min stale) — analytical views
		getNetRecoveryByMonth: trpc.financialReporting.getNetRecoveryByMonth.useQuery,
		getNetRecoveryByLineOfBusiness: trpc.financialReporting.getNetRecoveryByLineOfBusiness.useQuery,
		getCoverageCapUtilization: trpc.financialReporting.getCoverageCapUtilization.useQuery,
		getCoverageCapByCarrier: trpc.financialReporting.getCoverageCapByCarrier.useQuery,
		getNegotiationEfficiencyScatter:
			trpc.financialReporting.getNegotiationEfficiencyScatter.useQuery,

		// LONG tier (30 min stale) — strategic/historical views
		getRecoveryRateByCarrier: trpc.financialReporting.getRecoveryRateByCarrier.useQuery,
		getPaymentToRecoveryTimeline: trpc.financialReporting.getPaymentToRecoveryTimeline.useQuery,
		getRecoveryTimeDistribution: trpc.financialReporting.getRecoveryTimeDistribution.useQuery,
		getVarianceDecomposition: trpc.financialReporting.getVarianceDecomposition.useQuery,
	};
}

/**
 * Cache configuration presets for each query tier.
 * Pass these as the second argument to useQuery calls:
 *   useFinancialReportingTrpc().getRecoveryAgingBreakdown(undefined, CACHE_CONFIG.SHORT)
 */
export const REPORTING_CACHE = { SHORT, MEDIUM, LONG } as const;

/**
 * Invalidation helper — call from mutation onSuccess handlers.
 * Groups queries by the mutation trigger that should invalidate them.
 */
export function useFinancialReportingInvalidation() {
	const utils = trpc.useUtils();

	const invalidateAll = () => {
		utils.financialReporting.invalidate();
	};

	const onSettlementMutate = () => {
		utils.financialReporting.getRecoveryAgingBreakdown.invalidate();
		utils.financialReporting.getRecoveryRateByCarrier.invalidate();
		utils.financialReporting.getCoverageCapUtilization.invalidate();
		utils.financialReporting.getCoverageCapByCarrier.invalidate();
		utils.financialReporting.getVarianceDecomposition.invalidate();
		utils.financialReporting.getSettlementFunnel.invalidate();
		utils.financialReporting.getNegotiationEfficiencyScatter.invalidate();
	};

	const onRecoveryEventMutate = () => {
		utils.financialReporting.getRecoveryAgingBreakdown.invalidate();
		utils.financialReporting.getNetRecoveryByMonth.invalidate();
		utils.financialReporting.getNetRecoveryByLineOfBusiness.invalidate();
		utils.financialReporting.getPaymentToRecoveryTimeline.invalidate();
		utils.financialReporting.getRecoveryTimeDistribution.invalidate();
		utils.financialReporting.getVarianceDecomposition.invalidate();
	};

	const onPaymentMutate = () => {
		utils.financialReporting.getNetRecoveryByMonth.invalidate();
		utils.financialReporting.getNetRecoveryByLineOfBusiness.invalidate();
		utils.financialReporting.getPaymentToRecoveryTimeline.invalidate();
		utils.financialReporting.getRecoveryTimeDistribution.invalidate();
		utils.financialReporting.getVarianceDecomposition.invalidate();
	};

	const onClaimStatusChange = () => {
		utils.financialReporting.getSettlementFunnel.invalidate();
		utils.financialReporting.getStatuteDeadlineRisk.invalidate();
	};

	const onLiabilityChange = () => {
		utils.financialReporting.getVarianceDecomposition.invalidate();
	};

	return {
		invalidateAll,
		onSettlementMutate,
		onRecoveryEventMutate,
		onPaymentMutate,
		onClaimStatusChange,
		onLiabilityChange,
	};
}

// Export types for use in components
export type RecoveryAgingBreakdown = FinancialReportingOutput['getRecoveryAgingBreakdown'][number];
export type RecoveryRateByCarrier = FinancialReportingOutput['getRecoveryRateByCarrier'][number];
export type NetRecoveryByMonth = FinancialReportingOutput['getNetRecoveryByMonth'][number];
export type NetRecoveryByLob = FinancialReportingOutput['getNetRecoveryByLineOfBusiness'][number];
export type PaymentToRecoveryTimeline =
	FinancialReportingOutput['getPaymentToRecoveryTimeline'][number];
export type RecoveryTimeDistribution =
	FinancialReportingOutput['getRecoveryTimeDistribution'][number];
export type CoverageCapUtilization = FinancialReportingOutput['getCoverageCapUtilization'][number];
export type CoverageCapByCarrier = FinancialReportingOutput['getCoverageCapByCarrier'][number];
export type VarianceDecompositionItem =
	FinancialReportingOutput['getVarianceDecomposition'][number];
export type SettlementFunnelStage = FinancialReportingOutput['getSettlementFunnel'][number];
export type NegotiationEfficiencyPoint =
	FinancialReportingOutput['getNegotiationEfficiencyScatter'][number];
export type StatuteDeadlineRisk = FinancialReportingOutput['getStatuteDeadlineRisk'][number];
