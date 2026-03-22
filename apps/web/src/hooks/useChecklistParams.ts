'use client';

import { useParams } from 'next/navigation';

export function useChecklistParams() {
	const params = useParams();

	const checklistId = typeof params.checklistId === 'string' ? params.checklistId : undefined;
	const claimId = typeof params.claimId === 'string' ? params.claimId : undefined;
	const pageId = typeof params.pageId === 'string' ? params.pageId : undefined;
	const instanceId = typeof params.instanceId === 'string' ? params.instanceId : undefined;

	return {
		checklistId,
		claimId,
		pageId,
		instanceId,
	};
}
