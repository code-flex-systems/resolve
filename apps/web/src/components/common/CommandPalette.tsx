'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Command } from 'cmdk';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import {
	IconFileSearch,
	IconUsers,
	IconChecklist,
	IconGavel,
	IconLink,
	IconSearch,
} from '@tabler/icons-react';
import './CommandPalette.css';

/* -------------------------------------------------------------------------
   Constants
   ------------------------------------------------------------------------- */

const RESOURCE_ICONS: Record<string, React.ReactNode> = {
	claim: <IconFileSearch size={18} />,
	party: <IconUsers size={18} />,
	checklist: <IconChecklist size={18} />,
	settlement: <IconGavel size={18} />,
};

const RESOURCE_LABELS: Record<string, string> = {
	claim: 'Claim',
	party: 'Party',
	checklist: 'Checklist',
	settlement: 'Settlement',
};

type SearchResult = {
	id: string;
	client_id: string;
	resource_type: string;
	resource_id: string;
	linked_resource_type: string | null;
	linked_resource_id: string | null;
	label: string;
	secondary_label: string | null;
	metadata: Record<string, string>;
	url: string;
	updated_at: Date | string;
};

/* -------------------------------------------------------------------------
   Hook: useDebounce
   ------------------------------------------------------------------------- */

function useDebounce(value: string, delay: number): string {
	const [debounced, setDebounced] = useState(value);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(value), delay);
		return () => clearTimeout(timer);
	}, [value, delay]);

	return debounced;
}

/* -------------------------------------------------------------------------
   Component
   ------------------------------------------------------------------------- */

export default function CommandPalette() {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState('');
	const debouncedSearch = useDebounce(search, 300);
	const router = useRouter();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const isAdminUser = isAdmin || isSuperAdmin;

	// Register Cmd+K / Ctrl+K shortcut
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				setOpen((prev) => !prev);
			}
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, []);

	// Clear search when dialog closes
	useEffect(() => {
		if (!open) {
			setSearch('');
		}
	}, [open]);

	// Query the resource index
	const { data: results = [], isLoading } = trpc.user.globalSearch.useQuery(
		{ term: debouncedSearch },
		{ enabled: debouncedSearch.length > 0 }
	);

	// Group results by resource_type
	const grouped = useMemo(() => {
		const groups: Record<string, SearchResult[]> = {};
		for (const result of results) {
			const type = result.resource_type;
			if (!groups[type]) groups[type] = [];
			groups[type].push(result);
		}
		return groups;
	}, [results]);

	const handleSelect = useCallback(
		(url: string) => {
			// Remap admin claim URLs for contributors
			const resolvedUrl = isAdminUser ? url : url.replace(/^\/admin\/claims\b/, '/my-claims');
			router.push(resolvedUrl);
			setOpen(false);
		},
		[router, isAdminUser]
	);

	const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');

	return (
		<>
			{/* Trigger button rendered in the header */}
			<button className="cmdkSearchHint" onClick={() => setOpen(true)} type="button">
				<IconSearch size={14} />
				<span>Search</span>
				<kbd>{isMac ? '\u2318' : 'Ctrl+'}K</kbd>
			</button>

			{/* Command palette dialog */}
			<Command.Dialog
				open={open}
				onOpenChange={setOpen}
				label="Global search"
				shouldFilter={false}
				loop
			>
				<div className="cmdkInputWrapper">
					<IconSearch size={16} className="cmdkInputIcon" />
					<Command.Input
						value={search}
						onValueChange={setSearch}
						placeholder="Search claims, parties, checklists..."
					/>
				</div>

				<Command.List>
					{isLoading && debouncedSearch.length > 0 && (
						<Command.Loading>Searching...</Command.Loading>
					)}

					{!isLoading && debouncedSearch.length > 0 && results.length === 0 && (
						<Command.Empty>No results found.</Command.Empty>
					)}

					{Object.entries(grouped).map(([type, items]) => (
						<Command.Group key={type} heading={RESOURCE_LABELS[type] ?? type}>
							{items.map((result) => (
								<Command.Item
									key={result.id}
									value={result.id}
									onSelect={() => handleSelect(result.url)}
								>
									{RESOURCE_ICONS[result.resource_type] ?? <IconLink size={18} />}
									<div className="cmdkItemContent">
										<span className="cmdkItemLabel">{result.label}</span>
										{result.secondary_label && (
											<span className="cmdkItemSecondary">
												{result.linked_resource_type
													? `via ${RESOURCE_LABELS[result.linked_resource_type] ?? result.linked_resource_type} ${result.secondary_label}`
													: result.secondary_label}
											</span>
										)}
										{result.metadata && Object.keys(result.metadata).length > 0 && (
											<span className="cmdkItemMeta">
												{Object.entries(result.metadata)
													.slice(0, 3)
													.map(([key, value], i) => (
														<span key={key}>
															{i > 0 && ' \u00b7 '}
															{key}: {value}
														</span>
													))}
											</span>
										)}
									</div>
									<span className="cmdkItemBadge">
										{RESOURCE_LABELS[result.resource_type] ?? result.resource_type}
									</span>
								</Command.Item>
							))}
						</Command.Group>
					))}
				</Command.List>
			</Command.Dialog>
		</>
	);
}
