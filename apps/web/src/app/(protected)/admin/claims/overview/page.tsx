import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import ClaimManagementOverview from '@/components/admin/ClaimManagementOverview';

export default async function ClaimsOverviewPage() {
	const helpers = await createServerHelpers();
	await Promise.all([
		helpers.claim.getClaimCount.prefetch({}),
		helpers.claim.getRolloverClaimCount.prefetch(),
		helpers.feed.getFeedCount.prefetch({}),
		helpers.claim.getClaimStatusBreakdown.prefetch(),
		helpers.workflowAnalytics.getClaimsApproachingSLABreach.prefetch({ limit: 10 }),
	]);
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<ClaimManagementOverview />
		</HydrationBoundary>
	);
}
