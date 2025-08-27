'use client';
import { BarChart } from '@mui/x-charts-pro';
import theme, { BASE_COLOR } from '@/styles/theme';
import { Box, Fade, Paper, Stack, Typography } from '@mui/material';
import { formatMD } from '@/lib/utils/utils';
import dayjs, { Dayjs } from 'dayjs';
import { GetUserOutput, useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useMemo } from 'react';
import WobbleLoadingIndicator from '@/components/common/WobbleLoadingIndicator';

function MetricValue({ value }: { value: string | number }) {
	return (
		<Box display="flex" justifyContent="center" alignItems="center" style={styles.dot} bgcolor="#EBEBEB">
			<Typography fontSize={15} noWrap>
				{value}
			</Typography>
		</Box>
	);
}

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
		<Box width={800} height={500}>
			<Paper elevation={0} sx={styles.paper}>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
					<Paper
						elevation={0}
						sx={{
							width: 'fit-content',
							background: theme.palette.primary.main,
							padding: '5px 10px',
							borderRadius: 3,
						}}
						className="flex-row-center"
					>
						<Typography fontSize={17} color="white">
							User Activity
						</Typography>
					</Paper>
				</Box>

				<Fade key={JSON.stringify(filters)} in={true} unmountOnExit timeout={1000}>
					<span>
						{isLoading && (
							<Stack width={700} height={400} display="flex" justifyContent="center" alignItems="center">
								<WobbleLoadingIndicator />
							</Stack>
						)}
						{!isLoading && (
							<>
								<Stack
									width="100%"
									display="flex"
									justifyContent="flex-start"
									alignItems="flex-start"
									paddingLeft="10px"
									paddingTop="10px"
								>
									<Box
										width={200}
										display="flex"
										justifyContent="flex-start"
										alignItems="center"
										minWidth="fit-content"
									>
										<Typography fontSize={15} paddingRight="5px" noWrap>
											There were a total of
										</Typography>
										<MetricValue value={stats.total.toLocaleString()} />
										<Typography fontSize={15} padding="0px 5px" noWrap>
											event(s) in this period, average
										</Typography>
										<MetricValue value={stats.avg.toLocaleString()} />
										<Typography fontSize={15} paddingLeft="5px" noWrap>
											event(s) a day.
										</Typography>
									</Box>

									{stats.maxRow && maxUserRow && (
										<Box
											width={200}
											display="flex"
											justifyContent="flex-start"
											alignItems="center"
											paddingTop="5px"
											minWidth="fit-content"
										>
											<Typography fontSize={15} paddingRight="5px" noWrap>
												The busiest day was
											</Typography>
											<MetricValue value={dayjs(stats.maxRow.activity_date).format('MMMM D')} />
											<Typography fontSize={15} padding="0px 5px" noWrap>
												with
											</Typography>
											<MetricValue value={maxUserRow.active_users} />
											<Typography fontSize={15} padding="0px 5px" noWrap>
												active user(s) and
											</Typography>
											<MetricValue value={stats.maxRow.event_count} />
											<Typography fontSize={15} paddingLeft="5px" noWrap>
												event(s).
											</Typography>
										</Box>
									)}
								</Stack>

								<Box width="100%" flex={1} padding="20px">
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
										width={700}
										height={350}
										borderRadius={3}
										colors={[BASE_COLOR]}
										hideLegend
										loading={isFetching || isFetchingStats}
									/>
								</Box>
							</>
						)}
					</span>
				</Fade>
			</Paper>
		</Box>
	);
}

const styles = {
	divider: {
		width: '100%',
		height: 1,
		padding: '5px 10px',
	},
	dot: {
		padding: '0px 5px',
		height: 21,
		borderRadius: 5,
		cursor: 'pointer',
	},
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		minWidth: 'fit-content',
		height: '100%',
		borderRadius: 6,
		padding: '20px',
	},
	row: {
		width: '100%',
		padding: 10,
	},
};
