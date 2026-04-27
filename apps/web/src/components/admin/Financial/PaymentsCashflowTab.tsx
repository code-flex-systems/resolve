'use client';

import { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import type { DateRange } from '@/types/dateTypes';
import { useFinancialReportingTrpc, REPORTING_CACHE } from '@/hooks/trpc/useFinancialReportingTrpc';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import BasicMonthRangePicker from '@/components/common/BasicMonthRangePicker';
import NetRecoveryMonthChart from './NetRecoveryMonthChart';
import NetRecoveryLobChart from './NetRecoveryLobChart';
import CycleTimeChart from './CycleTimeChart';
import RecoveryDistributionChart from './RecoveryDistributionChart';

dayjs.extend(quarterOfYear);
dayjs.extend(utc);

function getCurrentQuarterRange(): [Dayjs, Dayjs] {
	const now = dayjs();
	const startMonth = (now.quarter() - 1) * 3;
	return [
		dayjs.utc().year(now.year()).month(startMonth).startOf('month'),
		dayjs.utc().year(now.year()).month(startMonth + 2).endOf('month'),
	];
}

export default function PaymentsCashflowTab() {
	const api = useFinancialReportingTrpc();
	const [range, setRange] = useState<DateRange<Dayjs>>(() => getCurrentQuarterRange());

	const rangeISO = useMemo(
		() =>
			range && range[0] && range[1]
				? { range: [range[0].toISOString(), range[1].toISOString()] as [string, string] }
				: null,
		[range]
	);

	const { data: monthlyData, isLoading: loadingMonthly } = api.getNetRecoveryByMonth(
		rangeISO!,
		{ ...REPORTING_CACHE.MEDIUM, enabled: !!rangeISO }
	);
	const { data: lobData, isLoading: loadingLob } = api.getNetRecoveryByLineOfBusiness(
		rangeISO!,
		{ ...REPORTING_CACHE.MEDIUM, enabled: !!rangeISO }
	);
	const { data: timelineData, isLoading: loadingTimeline } = api.getPaymentToRecoveryTimeline(
		rangeISO!,
		{ ...REPORTING_CACHE.LONG, enabled: !!rangeISO }
	);
	const { data: distributionData, isLoading: loadingDistribution } = api.getRecoveryTimeDistribution(
		rangeISO!,
		{ ...REPORTING_CACHE.LONG, enabled: !!rangeISO }
	);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div>
				<BasicMonthRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
			</div>

			<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
				<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
					Net Recovery by Month
				</span>
				{loadingMonthly ? (
					<Skeleton variant="rect" width="100%" height={350} />
				) : (
					<NetRecoveryMonthChart data={monthlyData ?? []} />
				)}
			</Card>

			<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
				<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
					Net Recovery by Line of Business
				</span>
				{loadingLob ? (
					<Skeleton variant="rect" width="100%" height={350} />
				) : (
					<NetRecoveryLobChart data={lobData ?? []} />
				)}
			</Card>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
				<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Payment-to-Recovery Timeline
					</span>
					{loadingTimeline ? (
						<Skeleton variant="rect" width="100%" height={350} />
					) : (
						<CycleTimeChart data={timelineData ?? []} />
					)}
				</Card>

				<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Recovery Time Distribution
					</span>
					{loadingDistribution ? (
						<Skeleton variant="rect" width="100%" height={350} />
					) : (
						<RecoveryDistributionChart data={distributionData ?? []} />
					)}
				</Card>
			</div>
		</div>
	);
}
