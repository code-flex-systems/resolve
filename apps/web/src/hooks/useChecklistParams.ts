'use client';

import { useParams } from 'next/navigation';

export function useChecklistParams() {
	const params = useParams();

	const checklistId = typeof params.checklistId === 'string' ? Number(params.checklistId) : undefined;
	const claimId = typeof params.claimId === 'string' ? Number(params.claimId) : undefined;
	const pageId = typeof params.pageId === 'string' ? Number(params.pageId) : undefined;
	const instanceId = typeof params.instanceId === 'string' ? Number(params.instanceId) : undefined;

	return {
		checklistId,
		claimId,
		pageId,
		instanceId,
	};
}
