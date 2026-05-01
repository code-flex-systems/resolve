'use client';
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
	Legend,
	ResponsiveContainer,
} from 'recharts';
import Card from '@/components/ui/Card';
import KpiCard from '@/components/ui/KpiCard';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import { formatCurrency, getQuarterRanges } from '@/lib/utils/recoveryUtils';
import type { DateRange } from '@/types/dateTypes';
import Skeleton from '@/components/ui/Skeleton';
import { IconBug } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';

export default function RecoveryMetricsChart({
	range,
	isBreakdown = false,
	recoveryStatus,
	recoverySource,
	checklistId,
}: {
	range?: DateRange<Dayjs>;
	isBreakdown?: boolean;
	recoveryStatus?: string | null;
	recoverySource?: string;
	checklistId?: string;
}) {
	const router = useRouter();
	const quarters = useMemo(() => getQuarterRanges(), []);

	// Convert DateRange to tuple of ISO strings for tRPC, default to current quarter
	const rangeISO = useMemo(
		() =>
			range && range[0] && range[1]
				? ([range[0].toISOString(), range[1].toISOString()] as [string, string])
				: quarters.current,
		[range, quarters.current]
	);

	// Build filter params
	const filterParams = useMemo(
		() => ({
			range: rangeISO,
			...(recoverySource && { recoverySource }),
			...(recoveryStatus && { recoveryStatus: recoveryStatus as any }),
			...(checklistId && { checklistId }),
		}),
		[rangeISO, recoverySource, recoveryStatus, checklistId]
	);

	// Fetch time series data for selected range
	const { data: timeSeriesData = [], isFetching: isFetchingTimeSeries } =
		useRecoveryTrpc().getRecoveryMetricsTimeSeries(filterParams, { enabled: true });

	// Fetch summary data for current range
	const { data: currentSummary, isFetching: isFetchingCurrentSummary } =
		useRecoveryTrpc().getRecoveryMetricsSummary(filterParams, { enabled: true });

	// Fetch summary data for last quarter (for comparison)
	const { data: lastQuarterSummary, isFetching: isFetchingLastSummary } =
		useRecoveryTrpc().getRecoveryMetricsSummary(
			{
				range: quarters.last,
				...(recoverySource && { recoverySource }),
				...(recoveryStatus && { recoveryStatus: recoveryStatus as any }),
				...(checklistId && { checklistId }),
			},
			{ enabled: true }
		);

	const isLoading = isFetchingTimeSeries || isFetchingCurrentSummary || isFetchingLastSummary;

	// Format data for chart
	const chartData = timeSeriesData.map((d: any) => ({
		name: dayjs(d.month_start).format('MMM YYYY'),
		expected: d.expected_recovery,
		actual: d.actual_recovery,
	}));

	// Calculate summary metrics
	const currentExpected = currentSummary?.total_expected ?? 0;
	const currentActual = currentSummary?.total_actual ?? 0;
	const currentVariance = currentSummary?.variance ?? 0;
	const currentRate = currentSummary?.recovery_rate ?? 0;

	const lastExpected = lastQuarterSummary?.total_expected ?? 0;
	const lastActual = lastQuarterSummary?.total_actual ?? 0;

	const expectedChange =
		lastExpected > 0 ? ((currentExpected - lastExpected) / lastExpected) * 100 : 0;
	const actualChange = lastActual > 0 ? ((currentActual - lastActual) / lastActual) * 100 : 0;

	const containerWidth = isBreakdown ? '100%' : 600;
	const chartHeight = isBreakdown ? 400 : 260;
	const padding = isBreakdown ? '30px' : '20px';
	const titleFontSize = isBreakdown ? 18 : 14;
	const cardPadding = isBreakdown ? 16 : 8;
	const cardLabelSize = isBreakdown ? 13 : 12;
	const cardValueSize = isBreakdown ? 24 : 16;
	const cardSubtextSize = isBreakdown ? 13 : 12;
	const spacing = isBreakdown ? 16 : 8;
	const marginBottom = isBreakdown ? 24 : 12;

	const formatTooltipValue = (value: number) =>
		`$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

	return (
		<div style={{ width: containerWidth }}>
			<Card variant="beveled" padding="none" style={{ ...styles.paper, padding }}>
				<div
					style={{
						width: '100%',
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						marginBottom,
					}}
				>
					<span style={{ fontSize: titleFontSize, fontWeight: 600 }}>
						{isBreakdown
							? 'Recovery Metrics'
							: `Recovery Metrics - Q${quarters.currentQuarter} ${quarters.currentYear}`}
					</span>
					{isBreakdown ? (
						<span style={{ fontSize: 14, color: '#d9d9d9' }}>
							vs Q{quarters.lastQuarter} {quarters.lastYear}
						</span>
					) : (
						<div>
							<span style={{ fontSize: 13, color: '#d9d9d9', marginRight: '15px' }}>
								vs Q{quarters.lastQuarter} {quarters.lastYear}
							</span>
							<Tooltip content="Open in Inspector">
								<Button variant="icon" size="sm" color="neutral">
									<IconBug
										style={{
											transform: 'scaleX(-1)',
											color: 'var(--text-accent)',
										}}
									/>
								</Button>
							</Tooltip>
						</div>
					)}
				</div>

				{isLoading && (
					<div
						style={{ display: 'flex', flexDirection: 'column' as const, width: '100%', gap: 16 }}
					>
						<div style={{ display: 'flex', flexDirection: 'row', gap: spacing }}>
							<Skeleton variant="rect" width="33%" height={80} />
							<Skeleton variant="rect" width="33%" height={80} />
							<Skeleton variant="rect" width="33%" height={80} />
						</div>
						<Skeleton variant="rect" width="100%" height={chartHeight} />
					</div>
				)}

				{!isLoading && (
					<>
						{/* Summary Cards */}
						<div style={{ display: 'flex', gap: spacing, marginBottom, width: '100%' }}>
							<KpiCard
								size="sm"
								value={formatCurrency(currentExpected)}
								label="Total Expected"
								subtitle={`${expectedChange >= 0 ? '+' : ''}${expectedChange.toFixed(1)}%${isBreakdown ? ' vs last quarter' : ''}`}
								subtitleColor={expectedChange >= 0 ? 'positive' : 'negative'}
							/>
							<KpiCard
								size="sm"
								value={formatCurrency(currentActual)}
								label="Total Actual"
								subtitle={`${actualChange >= 0 ? '+' : ''}${actualChange.toFixed(1)}%${isBreakdown ? ' vs last quarter' : ''}`}
								subtitleColor={actualChange >= 0 ? 'positive' : 'negative'}
							/>
							<KpiCard
								size="sm"
								value={formatCurrency(currentVariance)}
								label="Variance"
								subtitle={`${currentRate.toFixed(1)}% rate`}
							/>
							{isBreakdown && (
								<KpiCard
									size="sm"
									value={`${currentRate.toFixed(1)}%`}
									label="Recovery Rate"
									subtitle="actual / expected"
								/>
							)}
						</div>

						{/* Line Chart */}
						<div style={{ width: '100%', height: chartHeight }}>
							<ResponsiveContainer width="100%" height={chartHeight}>
								<LineChart data={chartData}>
									<XAxis
										dataKey="name"
										tick={{ fontSize: isBreakdown ? 11 : 10, fill: 'var(--text-muted)' }}
										stroke="var(--border)"
									/>
									<YAxis
										tickFormatter={(value: number) => formatCurrency(value)}
										tick={{ fontSize: isBreakdown ? 11 : 10, fill: 'var(--text-muted)' }}
										stroke="var(--border)"
									/>
									<RechartsTooltip
										formatter={(value: any, name: any) => [
											formatTooltipValue(value as number),
											name,
										]}
									/>
									<Legend verticalAlign="bottom" align="center" layout="horizontal" />
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
					</>
				)}
			</Card>
		</div>
	);
}

const styles = {
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		width: '100%',
		padding: '24px',
	},
};
