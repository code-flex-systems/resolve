import { HydrationBoundary } from '@tanstack/react-query';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';
import PageWrapper from '@/components/common/PageWrapper';
import { Stack } from '@mui/material';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';

/**
 * Standalone claim detail page accessible to all authenticated users
 * This route is outside of the admin area
 */
export default async function StandaloneClaimDetailPage({ params }: { params: { claimId: string } }) {
	const claimId = Number(params.claimId);
	const helpers = await createServerHelpers();

	await helpers.claim.getClaimDetail.prefetch({ claimId });
	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<PageWrapper>
				<Stack width="100%" flex={1} padding="20px">
					<ClaimDetailView claimId={claimId} />
				</Stack>
			</PageWrapper>
		</HydrationBoundary>
	);
}
