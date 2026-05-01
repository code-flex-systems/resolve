import { HydrationBoundary } from '@tanstack/react-query';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

export default async function ClaimDetailPage({
	params,
}: {
	params: Promise<{ claimId: string }>;
}) {
	const { claimId } = await params;
	const helpers = await createServerHelpers();

	await helpers.claim.getClaimDetail.prefetch({ claimId });
	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<div style={{ padding: 24, width: '100%', height: '100%', margin: '0 auto' }}>
				<ClaimDetailView claimId={claimId} />
			</div>
		</HydrationBoundary>
	);
}
