import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import ChecklistsOverview from '@/components/admin/ChecklistsOverview';

export default async function ChecklistsOverviewPage() {
	const helpers = await createServerHelpers();
	await Promise.all([
		helpers.checklist.getChecklistCount.prefetch({}),
		helpers.checklist.getChecklistClaimStats.prefetch({}),
		helpers.checklist.getChecklistRecentActivity.prefetch(),
	]);
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<ChecklistsOverview />
		</HydrationBoundary>
	);
}
