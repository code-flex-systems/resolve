'use client';

import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
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
	const chartData = timeSeriesData.map((d: any) => ({
		name: dayjs(d.month_start).format('MMM'),
		expected: d.expected_recovery,
		actual: d.actual_recovery,
	}));

	const formatTooltipValue = (value: number) =>
		`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

	return (
		<div style={{ width: '100%', height: '100%' }}>
			{isFetching && (
				<div style={{ display: 'flex', flexDirection: 'column' as const, width: '100%', gap: 8 }}>
					<Skeleton variant="rect" width="100%" height={130} />
				</div>
			)}

			{!isFetching && (
				<div style={{ width: '100%', height: 130 }}>
					<ResponsiveContainer width="100%" height={130}>
						<LineChart data={chartData} margin={{ left: 0, right: 10, top: 10, bottom: 25 }}>
							<XAxis
								dataKey="name"
								tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
								stroke="var(--border)"
							/>
							<YAxis
								tickFormatter={(value: number) => formatCurrency(value)}
								tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
								stroke="var(--border)"
							/>
							<Tooltip
								formatter={(value: any, name: any) => [formatTooltipValue(value as number), name]}
							/>
							<Legend verticalAlign="top" align="left" layout="vertical" />
							<Line
								type="linear"
								dataKey="expected"
								name="Expected"
								stroke="var(--text-accent)"
								strokeWidth={2}
								dot={false}
							/>
							<Line
								type="linear"
								dataKey="actual"
								name="Actual"
								stroke="var(--status-success)"
								strokeWidth={2}
								dot={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				</div>
			)}
		</div>
	);
}
