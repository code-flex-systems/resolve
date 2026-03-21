import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import PartyManagementOverview from '@/components/admin/PartyManagementOverview';

export default async function PartyManagementOverviewPage() {
	const helpers = await createServerHelpers();
	await helpers.party.getManagementStats.prefetch();
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<PartyManagementOverview />
		</HydrationBoundary>
	);
}
