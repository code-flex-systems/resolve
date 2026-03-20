'use client';
import { LineChart } from '@mui/x-charts-pro';
import { containerStyles } from '@/styles/theme';
import { Card, CardContent, Grid } from '@mui/material';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import BasicButtonStyled from '../../common/BasicButtonStyled';
import { useRouter } from 'next/navigation';
import { formatCurrency, getQuarterRanges } from '@/lib/utils/recoveryUtils';
import { DateRange } from '@mui/x-date-pickers-pro';
import Skeleton from '@/components/ui/Skeleton';
import { IconBug } from '@tabler/icons-react';

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
	checklistId?: number;
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
	const { data: currentSummary, isFetching: isFetchingCurrentSummary } = useRecoveryTrpc().getRecoveryMetricsSummary(
		filterParams,
		{ enabled: true }
	);

	// Fetch summary data for last quarter (for comparison)
	const { data: lastQuarterSummary, isFetching: isFetchingLastSummary } = useRecoveryTrpc().getRecoveryMetricsSummary(
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
	const xLabels = timeSeriesData.map((d) => dayjs(d.month_start).format('MMM YYYY'));
	const expectedData = timeSeriesData.map((d) => d.expected_recovery);
	const actualData = timeSeriesData.map((d) => d.actual_recovery);

	// Calculate summary metrics
	const currentExpected = currentSummary?.total_expected ?? 0;
	const currentActual = currentSummary?.total_actual ?? 0;
	const currentVariance = currentSummary?.variance ?? 0;
	const currentRate = currentSummary?.recovery_rate ?? 0;

	const lastExpected = lastQuarterSummary?.total_expected ?? 0;
	const lastActual = lastQuarterSummary?.total_actual ?? 0;

	const expectedChange = lastExpected> 0 ? ((currentExpected - lastExpected) / lastExpected) * 100 : 0;
	const actualChange = lastActual> 0 ? ((currentActual - lastActual) / lastActual) * 100 : 0;

	const containerWidth = isBreakdown ? '100%' : 600;
	const chartHeight = isBreakdown ? 400 : 260;
	const chartMargin = isBreakdown ? { left: 80, right: 20, top: 20, bottom: 60 } : { left: 60, right: 10, top: 10 };
	const padding = isBreakdown ? '30px' : '20px';
	const titleFontSize = isBreakdown ? 18 : 14;
	const cardPadding = isBreakdown ? 2 : 1;
	const cardLabelSize = isBreakdown ? 13 : 12;
	const cardValueSize = isBreakdown ? 24 : 16;
	const cardSubtextSize = isBreakdown ? 13 : 12;
	const spacing = isBreakdown ? 2 : 1;
	const marginBottom = isBreakdown ? 3 : 1.5;

	return (
		<div style={{ width: containerWidth }}>
			<div style={{ ...styles.paper, ...containerStyles.beveledCard, padding }}>
				<div
style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: marginBottom * 8 }}>
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
							<BasicButtonStyled
								buttonProps={{
									onClick: () => router.push('/admin/financial/recovery'),
								}}
								icon={
									<IconBug
									 style={{
											transform: 'scaleX(-1)',
											color: 'var(--text-accent)',
										}}
									/>
								}
								tooltipProps={{ title: 'Open in Inspector' }}
							/>
						</div>
					)}
				</div>

				{isLoading && (
					<div style={{ width: '100%', gap: 16 }}>
						<div style={{ display: 'flex', flexDirection: 'row', gap: spacing * 8 }}>
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
						<Grid container spacing={spacing} mb={marginBottom}>
							<Grid>
								<Card variant="outlined" sx={{ height: '100%' }}>
									<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
										<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
											Total Expected
										</span>
										<div style={{ fontSize: cardValueSize }}>
											{formatCurrency(currentExpected)}
										</div>
										<span
style={{ fontSize: cardSubtextSize, color: expectedChange>= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
											{expectedChange>= 0 ? '+' : ''}
											{expectedChange.toFixed(1)}%{isBreakdown ? ' vs last quarter' : ''}
										</span>
									</CardContent>
								</Card>
							</Grid>
							<Grid>
								<Card variant="outlined" sx={{ height: '100%' }}>
									<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
										<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
											Total Actual
										</span>
										<div style={{ fontSize: cardValueSize }}>
											{formatCurrency(currentActual)}
										</div>
										<span
style={{ fontSize: cardSubtextSize, color: actualChange>= 0 ? 'var(--status-success)' : 'var(--status-error)' }}>
											{actualChange>= 0 ? '+' : ''}
											{actualChange.toFixed(1)}%{isBreakdown ? ' vs last quarter' : ''}
										</span>
									</CardContent>
								</Card>
							</Grid>
							<Grid>
								<Card variant="outlined" sx={{ height: '100%' }}>
									<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
										<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
											Variance
										</span>
										<div style={{ fontSize: cardValueSize }}>
											{formatCurrency(currentVariance)}
										</div>
										<span style={{ fontSize: cardSubtextSize, color: 'var(--text-secondary)' }}>
											{currentRate.toFixed(1)}% rate
										</span>
									</CardContent>
								</Card>
							</Grid>
							{isBreakdown && (
								<Grid>
									<Card variant="outlined" sx={{ height: '100%' }}>
										<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
											<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
												Recovery Rate
											</span>
											<div style={{ fontSize: cardValueSize }}>
												{currentRate.toFixed(1)}%
											</div>
											<span
style={{ fontSize: cardSubtextSize, color: 'var(--text-secondary)' }}>
												actual / expected
											</span>
										</CardContent>
									</Card>
								</Grid>
							)}
						</Grid>

						{/* Line Chart */}
						<div style={{ width: '100%', height: chartHeight }}>
							<LineChart
								xAxis={[
									{
										scaleType: 'band',
										data: xLabels,
										tickLabelStyle: {
											angle: 0,
											textAnchor: 'middle',
											fontSize: isBreakdown ? 11 : 10,
										},
									},
								]}
								yAxis={[
									{
										valueFormatter: (value: number) => formatCurrency(value),
										tickLabelStyle: {
											fontSize: isBreakdown ? 11 : 10,
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
								margin={chartMargin}
								slotProps={{
									legend: {
										direction: 'horizontal',
										position: { vertical: 'bottom', horizontal: 'center' },
									},
								}}
							/>
						</div>
					</>
				)}
			</div>
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
