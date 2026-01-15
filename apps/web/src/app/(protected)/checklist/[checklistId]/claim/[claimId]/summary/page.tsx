import { HydrationBoundary } from '@tanstack/react-query';
import Summary from '@/components/pages/Summary';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

export default async function SummaryPage({
	params,
}: {
	params: { checklistId: string; claimId: string };
}) {
	const checklistId = Number(params.checklistId);
	const claimId = Number(params.claimId);
	const helpers = await createServerHelpers();

	await Promise.all([
		helpers.checklist.getChecklist.prefetch({ id: checklistId }),
		helpers.page.getPageInstanceTree.prefetch({ checklistId, claimId }),
		helpers.checklist.getChecklistSummary.prefetch({ checklistId, claimId }),
		helpers.checklist.getChecklistSummaryDetail.prefetch({ checklistId, claimId }),
	]);

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Summary />
		</HydrationBoundary>
	);
}
