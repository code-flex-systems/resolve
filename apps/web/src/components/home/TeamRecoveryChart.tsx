'use client';

import { LineChart } from '@mui/x-charts-pro';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { formatCurrency, getQuarterRanges } from '@/lib/utils/recoveryUtils';
import Skeleton from '@/components/ui/Skeleton';

export default function TeamRecoveryChart() {
	const quarters = useMemo(() => getQuarterRanges(), []);

	// Fetch team-wide time series data for current quarter
	const { data: timeSeriesData = [], isFetching } = useRecoveryTrpc().getRecoveryMetricsTimeSeries(
		{ range: quarters.current },
		{ enabled: true }
	);

	// Format data for chart
	const xLabels = timeSeriesData.map((d) => dayjs(d.month_start).format('MMM'));
	const expectedData = timeSeriesData.map((d) => d.expected_recovery);
	const actualData = timeSeriesData.map((d) => d.actual_recovery);

	return (
		<div style={{ width: '100%', height: '100%' }}>
			{isFetching && (
				<div style={{ width: '100%', gap: 8 }}>
					<Skeleton variant="rect" width="100%" height={130} />
				</div>
			)}

			{!isFetching && (
				<div style={{ width: '100%', height: 130 }}>
					<LineChart
						xAxis={[
							{
								scaleType: 'band',
								data: xLabels,
								tickLabelStyle: {
									angle: 0,
									textAnchor: 'middle',
									fontSize: 10,
								},
							},
						]}
						yAxis={[
							{
								valueFormatter: (value: number) => formatCurrency(value),
								tickLabelStyle: {
									fontSize: 10,
								},
							},
						]}
						series={[
							{
								data: expectedData,
								label: 'Expected',
								color: 'var(--text-accent)',
								curve: 'linear',
								valueFormatter: (value: number | null) =>
									value !== null
										? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
										: 'N/A',
							},
							{
								data: actualData,
								label: 'Actual',
								color: 'var(--status-success)',
								curve: 'linear',
								valueFormatter: (value: number | null) =>
									value !== null
										? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
										: 'N/A',
							},
						]}
						margin={{ left: 0, right: 10, top: 10, bottom: 25 }}
						slotProps={{
							legend: {
								direction: 'vertical',
								position: { vertical: 'top', horizontal: 'start' },
							},
						}}
					/>
				</div>
			)}
		</div>
	);
}
