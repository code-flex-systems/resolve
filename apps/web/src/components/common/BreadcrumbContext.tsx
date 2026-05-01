'use client';

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/* =========================================================================
   TYPES
   ========================================================================= */

export interface BreadcrumbSegment {
	label: string;
	href?: string;
	onClick?: () => void;
}

interface BreadcrumbContextValue {
	segments: BreadcrumbSegment[];
	/**
	 * Replace auto-generated segments entirely (legacy — prefer setDynamicSegments).
	 */
	setSegments: (segments: BreadcrumbSegment[]) => void;
	/**
	 * Set dynamic segments that are appended after auto-generated route segments.
	 * Replaces any previous dynamic segments. Use this for page-specific context
	 * like entity names, selected items, etc.
	 *
	 * The auto-generated segments from the URL path are preserved.
	 * Dynamic segments replace UUID path segments and add context.
	 *
	 * Example: On /checklist/[id]/claim/[id], auto segments = ["Checklist"].
	 * Call setDynamicSegments([{ label: "Auto Claims" }, { label: "Page 3" }])
	 * Result: ["Checklist", "Auto Claims", "Page 3"]
	 */
	setDynamicSegments: (segments: BreadcrumbSegment[]) => void;
	/** Clear all custom/dynamic segments (reverts to auto-generated) */
	clearSegments: () => void;
}

const BreadcrumbCtx = createContext<BreadcrumbContextValue>({
	segments: [],
	setSegments: () => {},
	setDynamicSegments: () => {},
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
	checklists: 'Checklists',
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
	edit: 'Edit',
	breakdown: 'Breakdown',
	summary: 'Summary',
};

/** Check if a path segment is a dynamic ID (UUID or numeric) */
function isDynamicSegment(part: string): boolean {
	// UUID pattern
	if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part)) return true;
	// Pure numeric
	if (/^\d+$/.test(part)) return true;
	return false;
}

function buildSegmentsFromPath(pathname: string): BreadcrumbSegment[] {
	const parts = pathname.split('/').filter(Boolean);
	const segments: BreadcrumbSegment[] = [];
	let href = '';

	for (const part of parts) {
		href += `/${part}`;
		// Skip dynamic segments (UUIDs, numbers) — they'll be replaced by dynamic segments from pages
		if (isDynamicSegment(part)) continue;
		const label =
			ROUTE_LABELS[part] ?? part.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
	const [dynamicSegments, setDynamic] = useState<BreadcrumbSegment[]>([]);

	// Reset all custom/dynamic segments on route change
	useEffect(() => {
		setCustomSegments(null);
		setDynamic([]);
	}, [pathname]);

	const autoSegments = buildSegmentsFromPath(pathname);

	// Final segments: custom override OR (auto + dynamic appended)
	const segments = customSegments ?? [...autoSegments, ...dynamicSegments];

	const setSegments = useCallback((segs: BreadcrumbSegment[]) => {
		setCustomSegments(segs);
	}, []);

	const setDynamicSegments = useCallback((segs: BreadcrumbSegment[]) => {
		setDynamic(segs);
	}, []);

	const clearSegments = useCallback(() => {
		setCustomSegments(null);
		setDynamic([]);
	}, []);

	return (
		<BreadcrumbCtx.Provider value={{ segments, setSegments, setDynamicSegments, clearSegments }}>
			{children}
		</BreadcrumbCtx.Provider>
	);
}

export function useBreadcrumbs() {
	return useContext(BreadcrumbCtx);
}
