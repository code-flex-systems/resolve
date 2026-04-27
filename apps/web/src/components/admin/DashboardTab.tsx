'use client';

import { trpc } from '@/lib/trpc';
import { useSessionContext } from '@/app/(protected)/SessionProvider';
import WorkflowHealthCard from './WorkflowHealthCard';
import RecentResources from './RecentResources';
import RecentAdminActivity from './RecentAdminActivity';
import NotificationsPlaceholder from './NotificationsPlaceholder';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

const defaultCounts = {
	slaBreaches: 0,
	slaWarnings: 0,
	pendingSuggestions: 0,
	pendingApprovals: 0,
};

export default function DashboardTab() {
	const { session } = useSessionContext();
	const userId = session?.user?.id ?? '';

	const { data: overviewCounts, isLoading: isLoadingOverview } =
		trpc.workflowAnalytics.getOverviewCounts.useQuery(undefined);

	const { data: configHealth } =
		trpc.workflowAnalytics.getConfigurationHealthCheck.useQuery(undefined);

	const { data: inactiveData } =
		trpc.user.getInactiveUserCount.useQuery(undefined);

	const { data: recentResources, isLoading: isLoadingResources } =
		trpc.user.getRecentResources.useQuery({ limit: 8 });

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading dashboard...">
			<div
				style={{
					width: '100%',
					flex: 1,
					display: 'flex',
					flexDirection: 'column',
					padding: '10px 0',
					overflow: 'auto',
					gap: 20,
				}}
			>
				{/* Header */}
				<div>
					<h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Admin Overview</h2>
					<p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
						Monitor workflow health, recent activity, and system notifications.
					</p>
				</div>

				{/* Top row: Recently Visited + Workflow Health */}
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
					<RecentResources
						data={recentResources ?? []}
						isLoading={isLoadingResources}
					/>
					<WorkflowHealthCard
						counts={overviewCounts ?? defaultCounts}
						configHealth={configHealth ?? null}
						inactiveUserCount={inactiveData?.count ?? 0}
						isLoading={isLoadingOverview}
					/>
				</div>

				{/* Bottom row: Recent Activity + Notifications */}
				<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
					{userId && <RecentAdminActivity userId={userId} />}
					<NotificationsPlaceholder />
				</div>
			</div>
		</PageTransitionWrapper>
	);
}
