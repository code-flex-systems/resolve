'use client';

import {
	IconChecklist,
	IconFileSearch,
	IconHourglass,
	IconLayoutRows,
	IconReload,
	IconRss,
	IconUsers,
} from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import KpiCard from '@/components/ui/KpiCard';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useRouter } from 'next/navigation';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import ClaimsMetric from '../metrics/Claims/ClaimsMetric';
import UserActivityMetric from '../metrics/UserActivity/UserActivityMetric';
import { useAdminStore } from '@/stores/useAdminStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import ActionsMetric from '../metrics/ActionsMetric';
import StackedMetric from '../checklist/StackedMetric';
import { capitalize, formatMetric, getDaysToEndOfFiscalQuarter } from '@/lib/utils/utils';
import MetricAction from '../common/MetricAction';
import { ClaimStatus } from '@/config/enums';
import RecoveryMetricsChart from '../metrics/Recovery/RecoveryMetricsChart';
import FQStepper from '../home/FQStepper';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import Skeleton from '@/components/ui/Skeleton';

const defaultClaimStats = {
	[ClaimStatus.SUBMITTED]: 0,
	[ClaimStatus.BLOCKED]: 0,
	[ClaimStatus.IN_PROGRESS]: 0,
	[ClaimStatus.UNWORKED]: 0,
};

/** Build a subtitle string from the breakdown keys of a values object, e.g. "Published: 5 · Draft: 2" */
function buildBreakdownSubtitle(values?: { total: number; [x: string]: number }): string | undefined {
	if (!values) return undefined;
	const parts = Object.keys(values)
		.filter((k) => k !== 'total')
		.map((k) => `${capitalize(k)}: ${formatMetric(values[k]).value}`);
	return parts.length > 0 ? parts.join(' \u00b7 ') : undefined;
}

export default function DashboardTab() {
	const router = useRouter();
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

	const kpiCards: {
		key: string;
		label: string;
		values?: { total: number; [x: string]: number };
		icon: React.ReactNode;
		iconColor: string;
		iconBgColor: string;
		isLoading: boolean;
		onClick: () => void;
	}[] = [
		{
			key: 'checklists',
			label: 'Checklists',
			values: checklistCounts,
			icon: <IconChecklist size={20} />,
			iconColor: '#fff',
			iconBgColor: 'var(--text-accent)',
			isLoading: isFetchingChecklists,
			onClick: () => router.push('/admin/workflow-configuration/checklists'),
		},
		{
			key: 'claims',
			label: 'Claims',
			values: claimCounts,
			icon: <IconFileSearch size={20} />,
			iconColor: '#fff',
			iconBgColor: 'var(--text-secondary)',
			isLoading: isFetchingClaims,
			onClick: () => router.push('/admin/claims'),
		},
		{
			key: 'users',
			label: 'Users',
			values: userCounts,
			icon: <IconUsers size={20} />,
			iconColor: '#fff',
			iconBgColor: 'var(--status-warning)',
			isLoading: isFetchingUsers,
			onClick: () => router.push('/admin/user-management/users'),
		},
		{
			key: 'feeds',
			label: 'Feeds',
			values: feedCounts,
			icon: <IconRss size={20} />,
			iconColor: '#fff',
			iconBgColor: '#9c27b0',
			isLoading: isFetchingFeedCounts,
			onClick: () => router.push('/admin/claims/feeds'),
		},
	];

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading dashboard...">
			<div
				style={{
					width: '100%',
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					padding: '10px 0px',
					overflow: 'auto',
				}}
			>
				<FQStepper />
				{/* KPI metric cards */}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, padding: '10px 0' }}>
					{kpiCards.map((card) => {
						const fm = formatMetric(card.values?.total);
						return card.isLoading ? (
							<Skeleton key={card.key} width={200} height={80} />
						) : (
							<div key={card.key} onClick={card.onClick} style={{ cursor: 'pointer' }}>
								<KpiCard
									size="lg"
									value={fm.value}
									label={card.label}
									subtitle={buildBreakdownSubtitle(card.values)}
									icon={card.icon}
									iconColor={card.iconColor}
									iconBgColor={card.iconBgColor}
								/>
							</div>
						);
					})}
				</div>

				{/* Quick Actions & Quick Stats row */}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 12, alignItems: 'flex-start' }}>
					<Card variant="beveled" padding="sm" style={{ minWidth: 300, flex: '1 1 300px' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quick Actions</span>
							<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
								{noQuickActions && (
									<span style={{ fontSize: 15, color: '#d9d9d9' }}>You're all caught up!</span>
								)}
								<Collapse open={claimStats.Submitted > 0 && !isFetchingClaimStats}>
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
								<Collapse open={inactiveUserCount.count > 0 && !isFetchingInactiveUserCount}>
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
					</Card>

					<Card variant="beveled" padding="sm" style={{ minWidth: 300, flex: '1 1 300px' }}>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
							<span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Quick Stats</span>
							<div style={{ display: 'flex', gap: 20, padding: '8px 0' }}>
								<StackedMetric
									icon={<IconHourglass size={25} />}
									value={`${getDaysToEndOfFiscalQuarter()}d`}
									subtext="to end of quarter"
									fontSize={25}
									fontSizeSubtext={15}
								/>
								<StackedMetric
									icon={<IconLayoutRows size={25} />}
									value={unprocessedClaimCount.toLocaleString()}
									subtext="unprocessed claims"
									fontSize={25}
									fontSizeSubtext={15}
								/>
								<StackedMetric
									icon={<IconReload style={{ fontSize: 25, transform: 'scaleX(-1)' }} />}
									value={rolloverCount.count.toLocaleString()}
									subtext="rollover claims"
									fontSize={25}
									fontSizeSubtext={15}
								/>
							</div>
						</div>
					</Card>
				</div>

				{/* Additional metric widgets */}
				<div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginTop: 16 }}>
					<div>
						<UserActivityMetric />
					</div>
					<div>
						<ClaimsMetric checklistId={selectedChecklistId} />
					</div>
					<div>
						<ActionsMetric />
					</div>
					<div>
						<RecoveryMetricsChart />
					</div>
				</div>
			</div>
		</PageTransitionWrapper>
	);
}
