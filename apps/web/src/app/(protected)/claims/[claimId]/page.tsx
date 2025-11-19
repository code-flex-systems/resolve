'use client';

import { useParams } from 'next/navigation';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';
import PageWrapper from '@/components/common/PageWrapper';
import { Stack } from '@mui/material';

/**
 * Standalone claim detail page accessible to all authenticated users
 * This route is outside of the admin area
 */
export default function StandaloneClaimDetailPage() {
	const params = useParams();
	const claimId = parseInt(params.claimId as string, 10);

	return (
		<PageWrapper>
			<Stack width="100%" flex={1} padding="20px">
				<ClaimDetailView claimId={claimId} backRoute="/dashboard" />
			</Stack>
		</PageWrapper>
	);
}
