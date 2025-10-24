'use client';

import { Box, Collapse, Fade, Grid, Paper, Stack, Typography } from '@mui/material';
import Checklist from '@mui/icons-material/Checklist';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import HorizontalSplit from '@mui/icons-material/HorizontalSplit';
import People from '@mui/icons-material/People';
import Replay from '@mui/icons-material/Replay';
import RssFeed from '@mui/icons-material/RssFeed';
import Timelapse from '@mui/icons-material/Timelapse';
import SimpleMetric from '../metrics/SimpleMetric';
import theme, { BASE_COLOR, BASE_COLOR_LIGHT, PURPLE } from '@/styles/theme';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useRouter } from 'next/navigation';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import { useState } from 'react';
import ClaimsMetric from '../metrics/Claims/ClaimsMetric';
import UserActivityMetric from '../metrics/UserActivity/UserActivityMetric';
import { useAdminStore } from '@/stores/useAdminStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import ActionsMetric from '../metrics/ActionsMetric';
import StackedMetric from '../checklist/StackedMetric';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { formatMD, getDaysToEndOfFiscalQuarter } from '@/lib/utils/utils';
import MetricAction from '../common/MetricAction';
import { ClaimStatus } from '@/config/enums';

const defaultClaimStats = {
	[ClaimStatus.SUBMITTED]: 0,
	[ClaimStatus.BLOCKED]: 0,
	[ClaimStatus.IN_PROGRESS]: 0,
	[ClaimStatus.UNWORKED]: 0,
};

export default function DashboardTab() {
	const router = useRouter();
	const [selected, setSelected] = useState<string | null>(null);
	const selectedChecklistId = useAdminStore((state) => state.selectedChecklistId);
	const setFeedId = useAdminStore((state) => state.setFeedId);
	const setShowInactiveUsers = useAdminStore((state) => state.setShowInactiveUsers);
	const toggleClaimAssignmentDialog = useAdminStore((state) => state.toggleClaimAssignmentDialog);
	const setClaimStatus = useMetricsStore((state) => state.setClaimStatus);
	const { data: userCounts, isFetching: isFetchingUsers } = useUserTrpc().count({});
	const { data: checklistCounts, isFetching: isFetchingChecklists } = useChecklistTrpc().count({});
	const { data: claimCounts, isFetching: isFetchingClaims } = useClaimTrpc().count({});
	const { data: feedCounts, isFetching: isFetchingFeedCounts } = useFeedTrpc().count({});
	const { data: lastSyncedFeed, isFetching: isFetchingLastSynced } = useFeedTrpc().getLastSynced();
	const { data: claimStats = defaultClaimStats, isFetching: isFetchingClaimStats } = useChecklistTrpc().stats({});
	const { data: rolloverCount = { count: 0 }, isFetching: isFetchingRolloverCount } = useClaimTrpc().countRollover();
	const { data: inactiveUserCount = { count: 0 }, isFetching: isFetchingInactiveUserCount } =
		useUserTrpc().countInactive();
	const unprocessedClaimCount =
		claimStats[ClaimStatus.BLOCKED] + claimStats[ClaimStatus.IN_PROGRESS] + claimStats[ClaimStatus.UNWORKED];
	const noQuickActions =
		!isFetchingClaimStats &&
		!isFetchingRolloverCount &&
		!isFetchingInactiveUserCount &&
		!lastSyncedFeed &&
		claimStats.Submitted === 0 &&
		inactiveUserCount.count === 0;

	const onSelect = (key: string) => {
		setSelected(selected === key ? null : key);
	};

	return (
		<Fade in={true} timeout={1000}>
			<Box
				width="100%"
				flex={1}
				display="flex"
				justifyContent="flex-start"
				alignContent="flex-start"
				padding="10px 0px"
				bgcolor="#F7F8FA"
				overflow="auto"
			>
				<Box display="flex" justifyContent="flex-start" alignContent="flex-start">
					<Stack display="flex" justifyContent="flex-start" alignContent="flex-start" paddingTop="10px">
						<SimpleMetric
							title="checklists"
							onClick={() => router.push('/admin/checklists')}
							onSelect={() => onSelect('checklists')}
							icon={<Checklist sx={styles.simpleMetricIcon} />}
							color={theme.palette.primary.main}
							values={checklistCounts}
							isLoading={isFetchingChecklists}
							selected={selected === 'checklists'}
						/>
						<SimpleMetric
							title="claims"
							onClick={() => router.push('/admin/feeds-and-claims')}
							onSelect={() => onSelect('claims')}
							icon={<ContentPasteSearch sx={styles.simpleMetricIcon} />}
							color={theme.palette.secondary.main}
							values={claimCounts}
							isLoading={isFetchingClaims}
							selected={selected === 'claims'}
						/>
						<SimpleMetric
							title="users"
							onClick={() => router.push('/admin/users')}
							onSelect={() => onSelect('users')}
							icon={<People sx={styles.simpleMetricIcon} />}
							color={theme.palette.warning.main}
							values={userCounts}
							isLoading={isFetchingUsers}
							selected={selected === 'users'}
						/>
						<SimpleMetric
							title="feeds"
							onClick={() => router.push('/admin/feeds-and-claims')}
							onSelect={() => onSelect('feeds')}
							icon={<RssFeed sx={styles.simpleMetricIcon} />}
							// color={PURPLE}
							color={'rgba(202, 142, 255, 0.7)'}
							values={feedCounts}
							isLoading={isFetchingFeedCounts}
							selected={selected === 'feeds'}
						/>
					</Stack>
					<Grid container marginTop="20px" alignContent="flex-start">
						<Grid>
							<Paper elevation={0} sx={styles.paper}>
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} paddingTop="10px" paddingLeft="10px">
									Quick Stats
								</Typography>
								<Box
									width="fit-content"
									display="flex"
									justifyContent="space-around"
									alignContent="center"
									padding="20px"
								>
									<StackedMetric
										icon={<Timelapse sx={{ fontSize: 25 }} />}
										value={`${getDaysToEndOfFiscalQuarter()}d`}
										subtext="to end of quarter"
										fontSize={25}
										fontSizeSubtext={15}
									/>
									<Box padding="0px 20px">
										<StackedMetric
											icon={<HorizontalSplit sx={{ fontSize: 25 }} />}
											value={unprocessedClaimCount.toLocaleString()}
											subtext="unprocessed claims"
											fontSize={25}
											fontSizeSubtext={15}
										/>
									</Box>
									<StackedMetric
										icon={<Replay sx={{ fontSize: 25, transform: 'scaleX(-1)' }} />}
										value={rolloverCount.count.toLocaleString()}
										subtext="rollover claims"
										fontSize={25}
										fontSizeSubtext={15}
									/>
								</Box>
							</Paper>
						</Grid>
						<Grid width="100%">
							<Paper elevation={0} sx={styles.paper}>
								<Typography fontSize={13} color={BASE_COLOR_LIGHT} paddingTop="10px" paddingLeft="10px">
									Quick Actions
								</Typography>
								<Box
									width="fit-content"
									display="flex"
									justifyContent="space-around"
									alignContent="center"
									padding="10px 20px 20px"
								>
									{noQuickActions && (
										<Typography fontSize={15} color="#d9d9d9">
											You're all caught up!
										</Typography>
									)}
									<Collapse in={!!lastSyncedFeed && !isFetchingLastSynced} orientation="horizontal">
										<MetricAction
											action={() => {
												setFeedId(lastSyncedFeed?.id);
												toggleClaimAssignmentDialog();
												router.push('/admin/feeds-and-claims');
											}}
											actionText={`Assign claims in ${lastSyncedFeed?.name ?? ''}`}
											actionValue={`${parseInt(lastSyncedFeed?.count_unassigned?.toString() ?? '0').toLocaleString()} in queue`}
											color="primary.main"
											loading={isFetchingLastSynced}
										/>
									</Collapse>
									<Collapse
										in={claimStats.Submitted > 0 && !isFetchingClaimStats}
										orientation="horizontal"
									>
										<MetricAction
											action={() => {
												setClaimStatus(ClaimStatus.SUBMITTED);
												router.push('/metrics/claims');
											}}
											actionText="Review submitted claims"
											actionValue={`${claimStats.Submitted.toLocaleString()} in queue`}
											color="secondary.main"
											loading={isFetchingClaimStats}
										/>
									</Collapse>
									<Collapse
										in={inactiveUserCount.count > 0 && !isFetchingInactiveUserCount}
										orientation="horizontal"
									>
										<MetricAction
											action={() => {
												setShowInactiveUsers(true);
												router.push('/admin/users');
											}}
											actionText="Review inactive accounts"
											actionValue={`${inactiveUserCount.count.toLocaleString()} users`}
											color="warning.main"
											loading={isFetchingInactiveUserCount}
										/>
									</Collapse>
								</Box>
							</Paper>
						</Grid>
						<Grid>
							<UserActivityMetric />
						</Grid>
						<Grid>
							<ClaimsMetric checklistId={selectedChecklistId} />
						</Grid>
						<Grid>
							<ActionsMetric />
						</Grid>
					</Grid>
				</Box>
			</Box>
		</Fade>
	);
}

const styles = {
	paper: {
		width: 'fit-content',
		minWidth: 300,
		height: 145,
		borderRadius: 3,
		margin: '15px',
	},
	simpleMetricIcon: {
		color: 'white',
		width: 30,
		height: 30,
	},
};
