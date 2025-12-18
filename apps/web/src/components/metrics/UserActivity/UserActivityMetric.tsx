'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { formatMDY } from '@/lib/utils/utils';
import theme, { BASE_COLOR } from '@/styles/theme';
import { Box, Divider, Paper, Skeleton, Stack, Typography } from '@mui/material';
import GraphicEq from '@mui/icons-material/GraphicEq';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import Troubleshoot from '@mui/icons-material/Troubleshoot';
import { useRouter } from 'next/navigation';
import { BarChart } from '@mui/x-charts-pro';
import ExpandableTitle from '@/components/common/ExpandableTitle';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import dayjs from 'dayjs';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import MetricValue from '@/components/common/MetricValue';
import UserActivitySummary from './UserActivitySummary';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

export default function UserActivityMetric() {
	const today = dayjs().endOf('day');
	const prev30 = today.subtract(30, 'day').startOf('day');
	const range: [string, string] = [prev30.toString(), today.toString()];
	const router = useRouter();
	const { data = [], isFetching } = useUserTrpc().activity({ filters: { range } });
	const { data: stats = { avg: 0, total: 0, maxRow: null }, isFetching: isFetchingStats } =
		useResponseTrpc().listLogStats({ filters: { range } }, { enabled: range.every((r) => !!r) });
	const formattedData = data.map((r) => ({ ...r, active_users: parseInt(r.active_users ?? '0') }));
	const xLabels = data.map((r) => r.activity_date);
	const yValues = formattedData.map((r) => r.active_users);
	const maxUserRow = formattedData.find((u) => u.activity_date === stats.maxRow?.activity_date);

	return (
		<Paper elevation={0} sx={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} animation="wave" sx={styles.skeleton} />
			) : (
				<Box display="flex" width={METRIC_WIDTH} height={METRIC_HEIGHT} borderRadius={3} padding="10px">
					<Stack
						flex={1}
						display="flex"
						justifyContent="flex-start"
						alignItems="flex-start"
						position="relative"
					>
						<Box
							width="100%"
							display="flex"
							justifyContent="space-between"
							alignItems="center"
							padding="5px"
						>
							<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
								User Activity
							</Typography>
							<Box display="flex" justifyContent="flex-end" alignItems="center">
								<Box marginRight="15px">
									<Typography fontSize={13} color="#d9d9d9">
										past 30 days
									</Typography>
								</Box>
								<Box marginRight="5px">
									<BasicButtonStyled
										buttonProps={{}}
										icon={<InfoOutlined />}
										tooltipProps={{
											title: 'Engagement is measured by the number of users generating activity logs for a given day.',
										}}
									/>
								</Box>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/admin/user-management/activity'),
										sx: { marginLeft: '5px' },
									}}
									icon={
										<Troubleshoot
											sx={{
												transform: 'scaleX(-1)',
												color: theme.palette.primary.main,
											}}
										/>
									}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							</Box>
						</Box>
						<Box
							width="calc(100% - 30xp)"
							display="flex"
							justifyContent="center"
							alignItems={yValues.length ? 'flex-end' : 'center'}
							height={120}
							marginTop="20px"
						>
							{yValues.length ? (
								<BarChart
									xAxis={[
										{
											scaleType: 'band',
											data: xLabels,
											position: 'none',
											valueFormatter: (v) => formatMDY(v),
											tickMinStep: 1,
											categoryGapRatio: 0.7,
										},
									]}
									yAxis={[{ position: 'none', tickMinStep: 1 }]}
									series={[{ data: yValues, label: 'Active users' }]}
									width={375}
									height={120}
									margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
									sx={{
										borderRadius: 3,
									}}
									colors={[theme.palette.primary.main]}
									borderRadius={10}
									hideLegend
								/>
							) : (
								<Typography fontSize={13}>No activity</Typography>
							)}
						</Box>
						<Paper elevation={0} sx={styles.paperInner}>
							<Stack
								width="100%"
								height="100%"
								display="flex"
								justifyContent="center"
								alignItems="center"
							>
								<UserActivitySummary
									totalEvents={stats.total}
									avgEvents={stats.avg}
									maxEventsRow={stats.maxRow}
								/>
							</Stack>
						</Paper>
					</Stack>
				</Box>
			)}
		</Paper>
	);
}

const styles = {
	paper: {
		borderRadius: 3,
		margin: '15px',
		width: METRIC_WIDTH,
		height: METRIC_HEIGHT,
	},
	paperInner: {
		position: 'absolute',
		zIndex: 100,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column',
		width: 375,
		height: 120,
		bottom: 0,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		borderRadius: 3,
		borderTop: `1px solid ${theme.palette.primary.main}`,
	},
	skeleton: {
		borderRadius: 3,
	},
};
