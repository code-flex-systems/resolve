import { HydrationBoundary } from '@tanstack/react-query';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import DocumentsOverview from '@/components/admin/DocumentsOverview';

export default async function DocumentsOverviewPage() {
	const helpers = await createServerHelpers();
	await Promise.all([
		helpers.doc.getDocumentStats.prefetch(),
		helpers.doc.listDocs.prefetch({ limit: 10 }),
	]);
	return (
		<HydrationBoundary state={helpers.dehydrate()}>
			<DocumentsOverview />
		</HydrationBoundary>
	);
}
