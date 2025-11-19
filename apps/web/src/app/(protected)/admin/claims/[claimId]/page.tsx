'use client';

import { useParams } from 'next/navigation';
import ClaimDetailView from '@/components/admin/claim-detail/ClaimDetailView';

export default function ClaimDetailPage() {
	const params = useParams();
	const claimId = parseInt(params.claimId as string, 10);

	return <ClaimDetailView claimId={claimId} backRoute="/admin/claims" />;
}
