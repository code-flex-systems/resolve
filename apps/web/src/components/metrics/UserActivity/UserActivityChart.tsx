'use client';
import { BarChart } from '@mui/x-charts-pro';
import { BASE_COLOR } from '@/styles/theme';
import { Box, Paper, Stack, Typography , Fade } from '@mui/material';
import { formatMD } from '@/lib/utils/utils';
import dayjs, { Dayjs } from 'dayjs';
import { GetUserOutput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useMemo } from 'react';
import MetricValue from '@/components/common/MetricValue';
import UserActivitySummary from './UserActivitySummary';
import Skeleton from '@/components/ui/Skeleton';

export default function UserActivityChart({
	checklistId,
	claimId,
	users,
	range,
	searchTerm,
}: {
	checklistId?: number;
	claimId?: number;
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
	searchTerm?: string;
}) {
	const today = dayjs().format('MM/DD/YYYY');
	const filters = useMemo(
		() => ({
			checklistId,
			claimId,
			range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
			users: users.map((u) => u.id),
			searchTerm,
		}),
		[checklistId, claimId, range, users, searchTerm]
	);

	const { data = [], isFetching } = useUserTrpc().activity({ filters }, { enabled: range.every((r) => !!r) });
	const { data: stats = { avg: 0, total: 0, maxRow: null }, isFetching: isFetchingStats } =
		useResponseTrpc().listLogStats({ filters }, { enabled: range.every((r) => !!r) });

	const isLoading = isFetching || isFetchingStats;
	const formattedData = data.map((r) => ({ ...r, active_users: parseInt(r.active_users ?? '0') }));
	const xLabels = formattedData.map((r) => r.activity_date);
	const yValues = formattedData.map((r) => r.active_users);
	const maxUserRow = formattedData.find((u) => u.activity_date === stats.maxRow?.activity_date);
	const maxY = maxUserRow ? Math.ceil(maxUserRow.active_users / 10) * 10 : 10;

	return (
		<Box width="100%" height={650}>
			<Paper elevation={0} sx={styles.paper}>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
					<Typography variant="h6" fontSize={18} fontWeight={600}>
						User Activity
					</Typography>
				</Box>

				<Fade key={JSON.stringify(filters)} in={true} unmountOnExit timeout={1000}>
					<Box width="100%">
						{isLoading && (
							<Stack width="100%" spacing={2} p={2}>
								<Stack direction="row" spacing={2}>
									<Skeleton variant="rect" width="33%" height={80} />
									<Skeleton variant="rect" width="33%" height={80} />
									<Skeleton variant="rect" width="33%" height={80} />
								</Stack>
								<Skeleton variant="rect" width="100%" height={350} />
							</Stack>
						)}
						{!isLoading && (
							<>
								<UserActivitySummary
									totalEvents={stats.total}
									avgEvents={stats.avg}
									maxEventsRow={stats.maxRow}
									isBreakdown={true}
								/>
								<Box width="100%" height={380} padding="20px">
									<BarChart
										xAxis={[
											{
												scaleType: 'band',
												data: xLabels,
												valueFormatter: (v) => formatMD(v),
												height: 50,
												tickMinStep: 1,
												tickLabelStyle: {
													angle: 45,
												},
												categoryGapRatio: 0.5,
											},
										]}
										yAxis={[{ tickMinStep: 1, max: maxY }]}
										series={[{ data: yValues, label: 'Active users' }]}
										margin={{ left: 0, right: 30, top: 20, bottom: 10 }}
										// width={700}
										// height={350}
										borderRadius={3}
										colors={['var(--text-accent)']}
										hideLegend
										loading={isFetching || isFetchingStats}
									/>
								</Box>
							</>
						)}
					</Box>
				</Fade>
			</Paper>
		</Box>
	);
}

const styles = {
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		minWidth: 'fit-content',
		width: '100%',
		height: '100%',
		padding: '24px',
	},
	row: {
		width: '100%',
		padding: 12,
	},
};
