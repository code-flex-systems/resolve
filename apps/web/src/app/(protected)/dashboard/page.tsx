import { HydrationBoundary } from '@tanstack/react-query';
import Home from '@/components/pages/Home';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import { getProtectedSession } from '../get-session';
import { getQuarterRanges } from '@/lib/utils/recoveryUtils';

export default async function DashboardPage() {
	const { session } = await getProtectedSession();
	const helpers = await createServerHelpers();
	const userId = session.user.id;
	const { current } = getQuarterRanges();

	await Promise.all([
		helpers.checklist.getChecklistClaimStats.prefetch({ users: [userId] }),
		helpers.checklist.getRecentChecklistClaims.prefetch(),
		helpers.deadline.listDeadlines.prefetch({ personalOnly: true }),
		helpers.recovery.getRecoveryMetricsTimeSeries.prefetch({ range: current }),
		helpers.comment.getComments.prefetch({ filters: { userId } }),
	]);

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Home />
		</HydrationBoundary>
	);
}
