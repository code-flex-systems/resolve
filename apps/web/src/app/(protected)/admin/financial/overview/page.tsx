import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import FinancialOverview from '@/components/admin/FinancialOverview';

export default async function FinancialOverviewPage() {
	const helpers = await createServerHelpers();
	await helpers.recovery.getQuarterlyRecoveryStats.prefetch({});
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<FinancialOverview />
		</HydrationBoundary>
	);
}
