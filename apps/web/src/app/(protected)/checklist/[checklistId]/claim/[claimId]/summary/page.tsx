import { HydrationBoundary } from '@tanstack/react-query';
import Summary from '@/components/pages/Summary';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import { SummarySegment } from '@/config/enums';

export default async function SummaryPage({
	params,
}: {
	params: Promise<{ checklistId: string; claimId: string }>;
}) {
	const { checklistId, claimId } = await params;
	const helpers = await createServerHelpers();

	await Promise.all([
		helpers.checklist.getChecklist.prefetch({ id: checklistId }),
		helpers.page.getPageInstanceTree.prefetch({ checklistId, claimId }),
		helpers.checklist.getChecklistSummary.prefetch({ checklistId, claimId }),
		helpers.checklist.getChecklistSummaryDetail.prefetch({ checklistId, claimId, segment: SummarySegment.ANSWERED }),
	]);

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Summary />
		</HydrationBoundary>
	);
}
