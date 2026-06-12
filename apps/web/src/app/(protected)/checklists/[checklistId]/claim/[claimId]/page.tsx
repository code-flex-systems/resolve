import { HydrationBoundary } from '@tanstack/react-query';
import Checklist from '@/components/pages/Checklist';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

const COMMENT_LIMIT = 30;

export default async function ChecklistPage({
	params,
}: {
	params: Promise<{ checklistId: string; claimId: string }>;
}) {
	const { checklistId, claimId } = await params;
	const helpers = await createServerHelpers();

	await Promise.all([
		helpers.checklist.getChecklist.prefetch({ id: checklistId }),
		helpers.claim.getClaim.prefetch({ checklistId, claimId }),
		helpers.checklist.getChecklistClaim.prefetch({ checklistId, claimId }),
		helpers.page.getPages.prefetch(),
		helpers.page.getVisiblePageInstances.prefetch({ checklistId, claimId }),
		helpers.page.getPageInstanceTree.prefetch({ checklistId, claimId }),
		helpers.comment.getComments.prefetch({
			filters: { checklistId, claimId },
			limit: COMMENT_LIMIT,
			offset: 0,
		}),
	]);

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Checklist />
		</HydrationBoundary>
	);
}
