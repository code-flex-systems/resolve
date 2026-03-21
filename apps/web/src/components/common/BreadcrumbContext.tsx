'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface BreadcrumbSegment {
	label: string;
	href?: string;
}

interface BreadcrumbContextValue {
	segments: BreadcrumbSegment[];
	/** Set custom breadcrumb segments (overrides auto-generated ones) */
	setSegments: (segments: BreadcrumbSegment[]) => void;
	/** Append a segment to the auto-generated trail */
	pushSegment: (segment: BreadcrumbSegment) => void;
	/** Clear custom segments (reverts to auto-generated) */
	clearSegments: () => void;
}

const BreadcrumbCtx = createContext<BreadcrumbContextValue>({
	segments: [],
	setSegments: () => {},
	pushSegment: () => {},
	clearSegments: () => {},
});

/* =========================================================================
   ROUTE → LABEL MAPPING
   ========================================================================= */

const ROUTE_LABELS: Record<string, string> = {
	home: 'Home',
	dashboard: 'Dashboard',
	'my-claims': 'My Claims',
	documents: 'Documents',
	parties: 'Parties',
	checklist: 'Checklist',
	metrics: 'Metrics',
	claims: 'Claims',
	recovery: 'Recovery',
	admin: 'Admin',
	overview: 'Overview',
	'user-management': 'User Management',
	users: 'Users',
	activity: 'Activity',
	'claim-management': 'Claim Management',
	feeds: 'Feeds',
	checklists: 'Checklists & Activity',
	templates: 'Templates',
	all: 'All Claims',
	workflows: 'Workflows',
	'desk-locations': 'Desk Locations',
	'desk-assignments': 'Desk Assignments',
	tasks: 'Tasks',
	'workflow-management': 'Workflow Management',
	'execution-history': 'Execution History',
	'party-management': 'Party Management',
	addresses: 'Addresses',
	representatives: 'Representatives',
	financial: 'Financial',
	system: 'System',
	logs: 'Logs',
	'claim-activity-logs': 'Claim Activity Logs',
	'reference-data': 'Reference Data',
	'statute-rules': 'Statute Rules',
	settings: 'Settings',
	'component-showcase': 'Component Showcase',
	edit: 'Edit',
	breakdown: 'Breakdown',
	summary: 'Summary',
};

function buildSegmentsFromPath(pathname: string): BreadcrumbSegment[] {
	const parts = pathname.split('/').filter(Boolean);
	const segments: BreadcrumbSegment[] = [];
	let href = '';

	for (const part of parts) {
		href += `/${part}`;
		// Skip dynamic segments like [claimId] — they'll be overridden by page context
		if (part.startsWith('[') || /^\d+$/.test(part)) continue;
		const label = ROUTE_LABELS[part] ?? part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
		segments.push({ label, href });
	}

	return segments;
}

/* =========================================================================
   PROVIDER
   ========================================================================= */

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
	const pathname = usePathname();
	const [customSegments, setCustomSegments] = useState<BreadcrumbSegment[] | null>(null);
	const [extraSegments, setExtraSegments] = useState<BreadcrumbSegment[]>([]);

	// Reset custom segments on route change
	useEffect(() => {
		setCustomSegments(null);
		setExtraSegments([]);
	}, [pathname]);

	const autoSegments = buildSegmentsFromPath(pathname);
	const segments = customSegments ?? [...autoSegments, ...extraSegments];

	const setSegments = useCallback((segs: BreadcrumbSegment[]) => {
		setCustomSegments(segs);
	}, []);

	const pushSegment = useCallback((seg: BreadcrumbSegment) => {
		setExtraSegments((prev) => [...prev, seg]);
	}, []);

	const clearSegments = useCallback(() => {
		setCustomSegments(null);
		setExtraSegments([]);
	}, []);

	return (
		<BreadcrumbCtx.Provider value={{ segments, setSegments, pushSegment, clearSegments }}>
			{children}
		</BreadcrumbCtx.Provider>
	);
}

export function useBreadcrumbs() {
	return useContext(BreadcrumbCtx);
}
