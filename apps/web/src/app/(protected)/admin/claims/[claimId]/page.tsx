import { HydrationBoundary } from '@tanstack/react-query';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

export default async function ClaimDetailPage({ params }: { params: { claimId: string } }) {
	const claimId = params.claimId;
	const helpers = await createServerHelpers();

	await helpers.claim.getClaimDetail.prefetch({ claimId });
	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<ClaimDetailView claimId={claimId} />
		</HydrationBoundary>
	);
}
