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
import CapUtilizationChart from './CapUtilizationChart';
import CapByCarrierTable from './CapByCarrierTable';
import NegotiationScatter from './NegotiationScatter';

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

export default function SettlementAnalysisTab() {
	const api = useFinancialReportingTrpc();
	const [range, setRange] = useState<DateRange<Dayjs>>(() => getCurrentQuarterRange());

	const rangeISO = useMemo(
		() =>
			range && range[0] && range[1]
				? ({ range: [range[0].toISOString(), range[1].toISOString()] as [string, string] })
				: null,
		[range]
	);

	const { data: capData, isLoading: loadingCap } = api.getCoverageCapUtilization(
		rangeISO!,
		{ ...REPORTING_CACHE.MEDIUM, enabled: !!rangeISO }
	);
	const { data: carrierCapData, isLoading: loadingCarrierCap } = api.getCoverageCapByCarrier(
		rangeISO!,
		{ ...REPORTING_CACHE.MEDIUM, enabled: !!rangeISO }
	);
	const { data: scatterData, isLoading: loadingScatter } = api.getNegotiationEfficiencyScatter(
		rangeISO!,
		{ ...REPORTING_CACHE.MEDIUM, enabled: !!rangeISO }
	);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div>
				<BasicMonthRangePicker defaultLabel="This Quarter" defaultValue={range} onConfirm={setRange} />
			</div>

			<div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
				<Card variant="beveled" padding="none" style={{ padding: '24px', height: 'fit-content' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Coverage Cap Utilization
					</span>
					{loadingCap ? (
						<Skeleton variant="rect" width="100%" height={300} />
					) : (
						<CapUtilizationChart data={capData ?? []} />
					)}
				</Card>

				<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
					<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
						Demand vs Settlement (Negotiation Efficiency)
					</span>
					{loadingScatter ? (
						<Skeleton variant="rect" width="100%" height={300} />
					) : (
						<NegotiationScatter data={scatterData ?? []} />
					)}
				</Card>
			</div>

			<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
				<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, display: 'block' }}>
					Cap Analysis by Carrier
				</span>
				{loadingCarrierCap ? (
					<Skeleton variant="rect" width="100%" height={300} />
				) : (
					<CapByCarrierTable data={carrierCapData ?? []} />
				)}
			</Card>
		</div>
	);
}
