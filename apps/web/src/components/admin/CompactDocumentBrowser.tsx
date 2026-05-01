'use client';

import { IconFile, IconFolder } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { capitalize, formatMDY } from '@/lib/utils/utils';
import { useState, useMemo, useEffect, useCallback } from 'react';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

type GridRow = { type: 'folder'; data: DocGroupListItem } | { type: 'document'; data: DocListItem };

interface CompactDocumentBrowserProps {
	onSelectDocument: (document: DocListItem) => void;
	filterByType?: 'image' | 'all'; // Restrict to images only or show all
	height?: number;
	userFilteredMode?: boolean; // Filter to show only user's documents
	userId?: string; // User ID for filtering
	allowedExtensions?: string[] | null; // Filter by allowed extensions
	disabled?: boolean; // Disable interactions during operations
}

export default function CompactDocumentBrowser({
	onSelectDocument,
	filterByType = 'all',
	height = 400,
	userFilteredMode = false,
	userId,
	allowedExtensions = null,
	disabled = false,
}: CompactDocumentBrowserProps) {
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

	const { data: groups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();
	const { data: docsResult, isFetching: isFetchingDocs } = useDocTrpc().listDocs({
		filters: { doc_group_id: currentFolderId },
	});
	const docs = docsResult?.rows ?? [];
	const isLoading = isFetchingGroups || isFetchingDocs;

	// Auto-navigate to user's folder when in userFilteredMode
	useEffect(() => {
		if (userFilteredMode && userId && groups.length > 0 && currentFolderId === null) {
			// Find the user's folder (group_type: 'user', user_id: userId)
			const userFolder = groups.find((g) => g.user_id === userId && g.group_type === 'user');
			if (userFolder) {
				setCurrentFolderId(userFolder.id);
			}
		}
	}, [userFilteredMode, userId, groups, currentFolderId]);

	// Build breadcrumb trail from root to current folder
	const breadcrumbTrail = useMemo(() => {
		if (!currentFolderId) return [];

		const trail: DocGroupListItem[] = [];
		let folderId: string | null = currentFolderId;

		// Walk up the tree to build the trail
		while (folderId !== null) {
			const folder = groups.find((g) => g.id === folderId);
			if (!folder) break;
			trail.unshift(folder); // Add to beginning
			folderId = folder.parent_group_id;
		}

		return trail;
	}, [currentFolderId, groups]);

	// Memoized overlay to avoid remounting on every render
	const noRowsOverlay = useCallback(() => {
		const text =
			currentFolderId === null
				? filterByType === 'image'
					? 'No images found. Upload images to select from the library.'
					: 'No documents found. Upload documents to select from the library.'
				: filterByType === 'image'
					? 'No images in this folder.'
					: 'No documents in this folder.';
		return (
			<CustomNoRowsOverlay
				text={text}
				icon={<IconFile style={{ fontSize: 40, color: 'var(--text-muted)' }} />}
			/>
		);
	}, [currentFolderId, filterByType]);

	// Build rows: folders (at root only) + documents
	const rows: GridRow[] = useMemo(() => {
		const result: GridRow[] = [];

		// In userFilteredMode, don't show any folders - only documents
		if (!userFilteredMode) {
			// Show folders based on current location
			if (currentFolderId === null) {
				// At root level, show folders without a parent
				const rootFolders = groups.filter((g) => g.parent_group_id === null);
				rootFolders.forEach((folder) => {
					result.push({ type: 'folder', data: folder });
				});
			} else {
				// Inside a folder, show child folders
				const childFolders = groups.filter((g) => g.parent_group_id === currentFolderId);
				childFolders.forEach((folder) => {
					result.push({ type: 'folder', data: folder });
				});
			}
		}

		// Filter documents based on various criteria
		let filteredDocs = docs;

		// Filter by type if needed
		if (filterByType === 'image') {
			filteredDocs = filteredDocs.filter((doc) => doc.mime_type?.startsWith('image/'));
		}

		// Filter by user if in userFilteredMode
		if (userFilteredMode && userId) {
			filteredDocs = filteredDocs.filter((doc) => doc.created_by === userId);
		}

		// Filter by allowed extensions
		if (allowedExtensions && allowedExtensions.length > 0) {
			filteredDocs = filteredDocs.filter((doc) => {
				const fileExtension = doc.filename.substring(doc.filename.lastIndexOf('.')).toLowerCase();
				return allowedExtensions.includes(fileExtension);
			});
		}

		filteredDocs.forEach((doc) => {
			result.push({ type: 'document', data: doc });
		});

		return result;
	}, [currentFolderId, groups, docs, filterByType, userFilteredMode, userId, allowedExtensions]);

	const handleRowDoubleClick = (row: GridRow) => {
		if (disabled) return; // Prevent interactions when disabled

		if (row.type === 'folder') {
			setCurrentFolderId(row.data.id);
		} else {
			onSelectDocument(row.data);
		}
	};

	return (
		<div style={{ ...styles.container, height }}>
			{/* Breadcrumbs for navigation - hidden in userFilteredMode */}
			{!userFilteredMode && (
				<nav
					style={{
						padding: 16,
						paddingBottom: 8,
						display: 'flex',
						alignItems: 'center',
						gap: 4,
						fontSize: 13,
					}}
				>
					<button
						onClick={() => !disabled && setCurrentFolderId(null)}
						style={{
							cursor: disabled ? 'default' : 'pointer',
							opacity: disabled ? 0.5 : 1,
							background: 'none',
							border: 'none',
							padding: 0,
							font: 'inherit',
							color: currentFolderId === null ? 'var(--text-primary)' : 'var(--text-secondary)',
							textDecoration: 'none',
						}}
					>
						Documents
					</button>
					{breadcrumbTrail.map((folder, index) => {
						const isLast = index === breadcrumbTrail.length - 1;
						return (
							<span key={folder.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
								<span style={{ color: 'var(--text-muted)' }}>/</span>
								{isLast ? (
									<span style={{ color: 'var(--text-primary)' }}>{folder.name}</span>
								) : (
									<button
										onClick={() => !disabled && setCurrentFolderId(folder.id)}
										style={{
											cursor: disabled ? 'default' : 'pointer',
											opacity: disabled ? 0.5 : 1,
											background: 'none',
											border: 'none',
											padding: 0,
											font: 'inherit',
											color: 'var(--text-secondary)',
											textDecoration: 'none',
										}}
									>
										{folder.name}
									</button>
								)}
							</span>
						);
					})}
				</nav>
			)}

			<DataTable
				rows={rows}
				loading={isLoading}
				columns={COLUMNS}
				getRowId={(row) => `${row.type}-${row.data.id}`}
				onRowDoubleClick={handleRowDoubleClick}
				hideFooter
			/>

			<div style={{ padding: 8, backgroundColor: '#f5f5f5', borderTop: '1px solid #e0e0e0' }}>
				<span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
					Double-click a {filterByType === 'image' ? 'image' : 'document'} to select it
				</span>
			</div>
		</div>
	);
}

const COLUMNS: ColumnDef<GridRow, any>[] = [
	{
		header: 'Name',
		accessorKey: 'name',
		cell: ({ row: { original: row } }) => {
			// For user folders, display user's full name and email
			if (
				row.type === 'folder' &&
				row.data.group_type === 'user' &&
				row.data.user_first &&
				row.data.user_last
			) {
				return (
					<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
						<IconFolder style={{ color: 'var(--text-muted)' }} />
						<div>
							<span>
								{row.data.user_first} {row.data.user_last}
							</span>
							{row.data.user_email && (
								<span style={{ color: 'var(--text-secondary)' }}>{row.data.user_email}</span>
							)}
						</div>
					</div>
				);
			}

			// Default rendering for other folders and documents
			return (
				<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
					{row.type === 'folder' ? (
						<IconFolder style={{ color: 'var(--text-muted)' }} />
					) : (
						<IconFile style={{ color: 'var(--text-muted)' }} />
					)}
					<span>{row.type === 'folder' ? row.data.name : row.data.title || row.data.alias}</span>
				</div>
			);
		},
	},
	{
		header: 'Type',
		accessorKey: 'type',
		size: 150,
		cell: ({ row: { original: row } }) => (
			<span style={{ color: 'var(--text-secondary)' }}>
				{row.type === 'folder' ? 'Folder' : capitalize(row.data.doc_type.replace('_', ' '))}
			</span>
		),
	},
	{
		header: 'Date',
		accessorKey: 'date',
		size: 150,
		cell: ({ row: { original: row } }) => (
			<span style={{ color: 'var(--text-secondary)' }}>{formatMDY(row.data.created_at)}</span>
		),
	},
];

const styles = {
	container: {
		width: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		border: '1px solid #e0e0e0',
		borderRadius: 4,
	},
};
