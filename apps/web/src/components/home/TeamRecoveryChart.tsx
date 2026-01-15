'use client';

import { LineChart } from '@mui/x-charts-pro';
import theme from '@/styles/theme';
import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs from 'dayjs';
import { formatCurrency, getQuarterRanges } from '@/lib/utils/recoveryUtils';

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
		<Box width="100%" height="100%">
			<Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
				<Typography variant="subtitle1" fontSize={14} fontWeight={600} marginBottom={1}>
					Team Recovery
				</Typography>
				<Typography variant="caption" fontSize={13} color="#d9d9d9" marginRight="15px">
					Q{quarters.currentQuarter}
				</Typography>
			</Box>

			{isFetching && (
				<Stack width="100%" spacing={1}>
					<Skeleton variant="rounded" width="100%" height={130} />
				</Stack>
			)}

			{!isFetching && (
				<Box width="100%" height={130}>
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
								color: theme.palette.primary.main,
								curve: 'linear',
								valueFormatter: (value: number | null) =>
									value !== null
										? `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
										: 'N/A',
							},
							{
								data: actualData,
								label: 'Actual',
								color: theme.palette.success.main,
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
				</Box>
			)}
		</Box>
	);
}
