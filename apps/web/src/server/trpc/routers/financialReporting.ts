import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import { parseDate } from '@/lib/parsers/zodParsers';
import {
	getRecoveryAgingBreakdown,
	getRecoveryRateByCarrier,
	getNetRecoveryByMonth,
	getNetRecoveryByLineOfBusiness,
	getPaymentToRecoveryTimeline,
	getRecoveryTimeDistribution,
	getCoverageCapUtilization,
	getCoverageCapByCarrier,
	getVarianceDecomposition,
	getSettlementFunnel,
	getNegotiationEfficiencyScatter,
	getStatuteDeadlineRisk,
} from '@/api/queries/financialReportingQueries';

const adminRoles = [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN];

const dateRangeInput = z.object({ range: z.tuple([parseDate(), parseDate()]) });

export const financialReportingRouter = router({
	getRecoveryAgingBreakdown: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getRecoveryAgingBreakdown(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getRecoveryRateByCarrier: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getRecoveryRateByCarrier(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getNetRecoveryByMonth: protectedProcedure.input(dateRangeInput).query(async ({ input, ctx }) => {
		requireRole(ctx, adminRoles);
		return getNetRecoveryByMonth(ctx.db, ctx.session.user.client_id!, input.range);
	}),

	getNetRecoveryByLineOfBusiness: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getNetRecoveryByLineOfBusiness(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getPaymentToRecoveryTimeline: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getPaymentToRecoveryTimeline(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getRecoveryTimeDistribution: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getRecoveryTimeDistribution(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getCoverageCapUtilization: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getCoverageCapUtilization(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getCoverageCapByCarrier: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getCoverageCapByCarrier(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getVarianceDecomposition: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getVarianceDecomposition(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getSettlementFunnel: protectedProcedure.input(dateRangeInput).query(async ({ input, ctx }) => {
		requireRole(ctx, adminRoles);
		return getSettlementFunnel(ctx.db, ctx.session.user.client_id!, input.range);
	}),

	getNegotiationEfficiencyScatter: protectedProcedure
		.input(dateRangeInput)
		.query(async ({ input, ctx }) => {
			requireRole(ctx, adminRoles);
			return getNegotiationEfficiencyScatter(ctx.db, ctx.session.user.client_id!, input.range);
		}),

	getStatuteDeadlineRisk: protectedProcedure.input(dateRangeInput).query(async ({ input, ctx }) => {
		requireRole(ctx, adminRoles);
		return getStatuteDeadlineRisk(ctx.db, ctx.session.user.client_id!, input.range);
	}),
});
