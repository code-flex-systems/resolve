import { HydrationBoundary } from '@tanstack/react-query';
import Checklist from '@/components/pages/Checklist';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

export default async function ChecklistPage({
	params,
}: {
	params: Promise<{ checklistId: string }>;
}) {
	const { checklistId } = await params;
	const helpers = await createServerHelpers();

	await Promise.all([
		helpers.checklist.getChecklist.prefetch({ id: checklistId }),
		helpers.page.getPages.prefetch(),
	]);

	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Checklist />
		</HydrationBoundary>
	);
}
