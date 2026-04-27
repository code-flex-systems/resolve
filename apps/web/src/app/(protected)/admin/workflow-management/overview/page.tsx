import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import WorkflowManagementOverview from '@/components/admin/WorkflowManagementOverview';

export default async function WorkflowManagementOverviewPage() {
	const helpers = await createServerHelpers();
	await Promise.all([
		helpers.workflowAnalytics.getDeskWorkLoad.prefetch({}),
		helpers.workflowAnalytics.getDeskQueueDepth.prefetch({}),
		helpers.workflowAnalytics.getTaskThroughputToday.prefetch({}),
		helpers.workflowAnalytics.getWorkflowSuggestions.prefetch(),
		helpers.workflowAnalytics.getClaimsApproachingSLABreach.prefetch({ limit: 10 }),
		helpers.workflowAnalytics.getConfigurationHealthCheck.prefetch(),
		helpers.workflowAnalytics.getUserWorkload.prefetch({}),
	]);
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<WorkflowManagementOverview />
		</HydrationBoundary>
	);
}
