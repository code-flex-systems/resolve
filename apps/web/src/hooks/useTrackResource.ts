'use client';

import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

/**
 * Hook to track resource visits for the "Recently Visited" feature.
 * Call this in any detail view to automatically record the visit on mount.
 *
 * @param resourceType - e.g., 'claim', 'checklist', 'workflow', 'party'
 * @param resourceId - UUID of the resource
 * @param resourceLabel - display name (e.g., claim number, checklist name)
 * @param resourceUrl - URL to navigate back to this resource
 * @param enabled - only track when true (default: true)
 */
export function useTrackResource(
	resourceType: string,
	resourceId: string | undefined | null,
	resourceLabel: string | undefined | null,
	resourceUrl: string,
	enabled: boolean = true
) {
	const mutation = trpc.user.trackResourceVisit.useMutation();
	const tracked = useRef(false);

	useEffect(() => {
		if (!enabled || !resourceId || tracked.current) return;
		tracked.current = true;

		mutation.mutate({
			resource_type: resourceType,
			resource_id: resourceId,
			resource_label: resourceLabel ?? null,
			resource_url: resourceUrl,
		});
	}, [resourceType, resourceId, resourceLabel, resourceUrl, enabled]);
}
