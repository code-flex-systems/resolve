import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import UserManagementOverview from '@/components/admin/UserManagementOverview';

export default async function UserManagementOverviewPage() {
	const helpers = await createServerHelpers();
	await helpers.user.getManagementStats.prefetch();
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<UserManagementOverview />
		</HydrationBoundary>
	);
}
