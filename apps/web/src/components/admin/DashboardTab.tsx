'use client';

import { IconChecklist, IconFileSearch, IconHourglass, IconLayoutRows, IconReload, IconRss, IconUsers } from '@tabler/icons-react';
import { Grid } from '@mui/material';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import SimpleMetric from '../metrics/SimpleMetric';
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
import RecoveryMetricsChart from '../metrics/Recovery/RecoveryMetricsChart';
import FQStepper from '../home/FQStepper';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

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
	const setShowInactiveUsers = useAdminStore((state) => state.setShowInactiveUsers);
	const setClaimStatus = useMetricsStore((state) => state.setClaimStatus);
	const { data: userCounts, isFetching: isFetchingUsers } = useUserTrpc().count({});
	const { data: checklistCounts, isFetching: isFetchingChecklists } = useChecklistTrpc().count({});
	const { data: claimCounts, isFetching: isFetchingClaims } = useClaimTrpc().count({});
	const { data: feedCounts, isFetching: isFetchingFeedCounts } = useFeedTrpc().count({});
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
		claimStats.Submitted === 0 &&
		inactiveUserCount.count === 0;

	const onSelect = (key: string) => {
		setSelected(selected === key ? null : key);
	};

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading dashboard...">
			<div
				style={{ width: '100%', flex: 1, display: 'flex', justifyContent: 'flex-start', padding: '10px 0px', overflow: 'auto' }}>
				<div style={{ display: 'flex', justifyContent: 'flex-start' }}>
					<FQStepper />
					<div style={{ display: 'flex', justifyContent: 'flex-start', paddingTop: '10px' }}>
						<SimpleMetric
							title="checklists"
							onClick={() => router.push('/admin/workflow-configuration/checklists')}
							onSelect={() => onSelect('checklists')}
							icon={<IconChecklist style={styles.simpleMetricIcon} />}
							color={'var(--text-accent)'}
							values={checklistCounts}
							isLoading={isFetchingChecklists}
							selected={selected === 'checklists'}
						/>
						<SimpleMetric
							title="claims"
							onClick={() => router.push('/admin/claims')}
							onSelect={() => onSelect('claims')}
							icon={<IconFileSearch style={styles.simpleMetricIcon} />}
							color={'var(--text-secondary)'}
							values={claimCounts}
							isLoading={isFetchingClaims}
							selected={selected === 'claims'}
						/>
						<SimpleMetric
							title="users"
							onClick={() => router.push('/admin/user-management/users')}
							onSelect={() => onSelect('users')}
							icon={<IconUsers style={styles.simpleMetricIcon} />}
							color={'var(--status-warning)'}
							values={userCounts}
							isLoading={isFetchingUsers}
							selected={selected === 'users'}
						/>
						<SimpleMetric
							title="feeds"
							onClick={() => router.push('/admin/claims/feeds')}
							onSelect={() => onSelect('feeds')}
							icon={<IconRss style={styles.simpleMetricIcon} />}
							color={'#9c27b0'}
							values={feedCounts}
							isLoading={isFetchingFeedCounts}
							selected={selected === 'feeds'}
						/>
					</div>
					<Grid container marginTop="20px" alignContent="flex-start">
						<Grid>
							<div style={styles.paper}>
								<span style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: '10px', paddingLeft: '10px' }}>
									Quick Actions
								</span>
								<div
									style={{ width: 'fit-content', display: 'flex', justifyContent: 'space-around', padding: '10px 20px 20px' }}>
									{noQuickActions && (
										<span style={{ fontSize: 15, color: '#d9d9d9' }}>
											You're all caught up!
										</span>
									)}
									<Collapse
										open={claimStats.Submitted > 0 && !isFetchingClaimStats}
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
										open={inactiveUserCount.count > 0 && !isFetchingInactiveUserCount}
											>
										<MetricAction
											action={() => {
												setShowInactiveUsers(true);
												router.push('/admin/user-management/users');
											}}
											actionText="Review inactive accounts"
											actionValue={`${inactiveUserCount.count.toLocaleString()} users`}
											color={'var(--status-warning)'}
											loading={isFetchingInactiveUserCount}
										/>
									</Collapse>
								</div>
							</div>
						</Grid>
						<Grid>
							<div style={styles.paper}>
								<span style={{ fontSize: 13, color: 'var(--text-muted)', paddingTop: '10px', paddingLeft: '10px' }}>
									Quick Stats
								</span>
								<div
									style={{ width: 'fit-content', display: 'flex', justifyContent: 'space-around', padding: '20px' }}>
									<StackedMetric
										icon={<IconHourglass size={25} />}
										value={`${getDaysToEndOfFiscalQuarter()}d`}
										subtext="to end of quarter"
										fontSize={25}
										fontSizeSubtext={15}
									/>
									<div style={{ padding: '0px 20px' }}>
										<StackedMetric
											icon={<IconLayoutRows size={25} />}
											value={unprocessedClaimCount.toLocaleString()}
											subtext="unprocessed claims"
											fontSize={25}
											fontSizeSubtext={15}
										/>
									</div>
									<StackedMetric
										icon={<IconReload style={{ fontSize: 25, transform: 'scaleX(-1)' }} />}
										value={rolloverCount.count.toLocaleString()}
										subtext="rollover claims"
										fontSize={25}
										fontSizeSubtext={15}
									/>
								</div>
							</div>
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
						<Grid margin="15px">
							<RecoveryMetricsChart />
						</Grid>
					</Grid>
				</div>
			</div>
		</PageTransitionWrapper>
	);
}

const styles = {
	paper: {
		width: 'fit-content',
		minWidth: 300,
		height: 145,
		borderRadius: 12,
		margin: '15px',
		border: `1px solid ${'var(--border)'}`,
		boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.04)',
		padding: '5px',
	},
	simpleMetricIcon: {
		color: 'white',
		width: 30,
		height: 30,
	},
};
