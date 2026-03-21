import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import SystemOverview from '@/components/admin/SystemOverview';

export default async function SystemOverviewPage() {
	const helpers = await createServerHelpers();
	await helpers.adminLogs.getSystemStats.prefetch();
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<SystemOverview />
		</HydrationBoundary>
	);
}
