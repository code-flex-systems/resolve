'use client';

import { useMemo, useState } from 'react';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import quarterOfYear from 'dayjs/plugin/quarterOfYear';
import utc from 'dayjs/plugin/utc';
import BasicMonthRangePicker from '@/components/common/BasicMonthRangePicker';
import RecoveryMetricsChart from './RecoveryMetricsChart';
import RecoveryEventsTable from './RecoveryEventsTable';
import TopPerformersSection from './TopPerformersSection';
import Divider from '@/components/ui/Divider';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useFinancialReportingTrpc, REPORTING_CACHE } from '@/hooks/trpc/useFinancialReportingTrpc';
import RecoveryAgingChart from '@/components/admin/Financial/RecoveryAgingChart';
import CarrierRateChart from '@/components/admin/Financial/CarrierRateChart';

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

export default function RecoveryView() {
	const reportingApi = useFinancialReportingTrpc();
	const [range, setRange] = useState<DateRange<Dayjs>>(() => getCurrentQuarterRange());

	const reportingRangeISO = useMemo(
		() =>
			range && range[0] && range[1]
				? { range: [range[0].toISOString(), range[1].toISOString()] as [string, string] }
				: null,
		[range]
	);

	const { data: agingData, isLoading: loadingAging } = reportingApi.getRecoveryAgingBreakdown(
		reportingRangeISO!,
		{ ...REPORTING_CACHE.SHORT, enabled: !!reportingRangeISO }
	);
	const { data: carrierData, isLoading: loadingCarrier } = reportingApi.getRecoveryRateByCarrier(
		reportingRangeISO!,
		{ ...REPORTING_CACHE.LONG, enabled: !!reportingRangeISO }
	);

	return (
		<div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column' }}>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'row', alignItems: 'center' }}>
				<BasicMonthRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
			</div>
			<div style={styles.divider}>
				<Divider />
			</div>
			<div style={{ width: '100%', height: 'calc(100vh - 70px)', display: 'flex', flexDirection: 'column', padding: '20px', overflow: 'auto' }}>
				<div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>
					<RecoveryMetricsChart
						range={range}
						isBreakdown={true}
					/>
					<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
						<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
							<span style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'block' }}>
								Recovery Aging
							</span>
							{loadingAging ? (
								<Skeleton variant="rect" width="100%" height={300} />
							) : (
								<RecoveryAgingChart data={agingData ?? []} />
							)}
						</Card>
						<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
							<span style={{ fontSize: 16, fontWeight: 600, marginBottom: 12, display: 'block' }}>
								Recovery Rate by Carrier
							</span>
							{loadingCarrier ? (
								<Skeleton variant="rect" width="100%" height={300} />
							) : (
								<CarrierRateChart data={carrierData ?? []} />
							)}
						</Card>
					</div>
					<TopPerformersSection range={range} />
					<RecoveryEventsTable range={range} />
				</div>
			</div>
		</div>
	);
}

const styles = {
	divider: {
		width: '100%',
	},
};
