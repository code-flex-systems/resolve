import { HydrationBoundary } from '@tanstack/react-query';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';
import { createServerHelpers } from '@/server/trpc/createServerHelpers';
import { Box } from '@mui/material';

export default async function ClaimDetailPage({ params }: { params: { claimId: string } }) {
	const claimId = Number(params.claimId);
	const helpers = await createServerHelpers();

	await helpers.claim.getClaimDetail.prefetch({ claimId });
	const dehydratedState = helpers.dehydrate();

	return (
		<HydrationBoundary state={dehydratedState}>
			<Box sx={styles.container}>
				<ClaimDetailView claimId={claimId} />
			</Box>
		</HydrationBoundary>
	);
}

const styles = {
	container: {
		padding: '24px',
		width: '100%',
		height: '100%',
		margin: '0 auto',
	},
};
