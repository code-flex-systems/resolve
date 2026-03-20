'use client';

import { IconFile, IconFolder, IconSettings } from '@tabler/icons-react';
import { DataGridPro, GridColDef, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import IconHeaderCell from '../common/IconHeaderCell';
import { dataGridFocusStyles } from '@/styles/theme';
import { capitalize, formatMDY } from '@/lib/utils/utils';
import { useMemo, useCallback } from 'react';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';

type GridRow = { type: 'folder'; data: DocGroupListItem } | { type: 'document'; data: DocListItem };

interface DocumentNavigationTableProps {
	groups: DocGroupListItem[];
	docs: DocListItem[];
	currentFolderId: number | null;
	onNavigate: (folderId: number | null) => void;
	onDocumentPreview: (doc: DocListItem) => void;
	loading?: boolean;
	editMode?: boolean;
	selectedRows?: GridRowSelectionModel;
	onRowSelectionChange?: (selection: GridRowSelectionModel) => void;
	showBreadcrumbs?: boolean;
	breadcrumbRootLabel?: string;
	adminMode?: boolean; // Show system folder indicators
	emptyRootText?: string; // Custom empty state text for root level
	emptyFolderText?: string; // Custom empty state text for folders
	hiddenBreadcrumbFolderId?: number; // Folder ID to hide from breadcrumbs (e.g., Shared folder)
}

export default function DocumentNavigationTable({
	groups,
	docs,
	currentFolderId,
	onNavigate,
	onDocumentPreview,
	loading = false,
	editMode = false,
	selectedRows = [],
	onRowSelectionChange,
	showBreadcrumbs = true,
	breadcrumbRootLabel = 'Documents',
	adminMode = false,
	emptyRootText = 'No folders or documents yet. Click "Add Folder" or "Add Document" to get started.',
	emptyFolderText = 'No documents in this folder yet. Click "Add Document" to upload.',
	hiddenBreadcrumbFolderId,
}: DocumentNavigationTableProps) {
	// Get current folder for breadcrumbs
	const currentFolder = useMemo(() => {
		return currentFolderId ? groups.find((g) => g.id === currentFolderId) : null;
	}, [currentFolderId, groups]);

	// Get parent folder for breadcrumbs (for two-level navigation)
	const parentFolder = useMemo(() => {
		if (!currentFolder?.parent_group_id) return null;
		return groups.find((g) => g.id === currentFolder.parent_group_id) || null;
	}, [currentFolder, groups]);

	// Memoized overlay to avoid remounting on every render
	const noRowsOverlay = useCallback(
		() => (
			<CustomNoRowsOverlay
				text={currentFolderId === null ? emptyRootText : emptyFolderText}
				icon={<IconFile style={{ fontSize: 40, color: 'var(--text-muted)' }} />}
			/>
		),
		[currentFolderId, emptyRootText, emptyFolderText]
	);

	// Build rows: show child folders + documents
	const rows: GridRow[] = useMemo(() => {
		const result: GridRow[] = [];

		// Show child folders at current level
		if (currentFolderId === null) {
			// At root level, show folders without a parent
			const rootFolders = groups.filter((g) => g.parent_group_id === null);
			rootFolders.forEach((folder) => {
				result.push({ type: 'folder', data: folder });
			});
		} else {
			// Inside a folder, show its child folders
			const childFolders = groups.filter((g) => g.parent_group_id === currentFolderId);
			childFolders.forEach((folder) => {
				result.push({ type: 'folder', data: folder });
			});
		}

		// Show documents for current location
		docs.forEach((doc) => {
			result.push({ type: 'document', data: doc });
		});

		return result;
	}, [currentFolderId, groups, docs]);

	const handleRowDoubleClick = (params: GridRowParams<GridRow>) => {
		if (editMode) return; // Don't navigate in edit mode

		if (params.row.type === 'folder') {
			onNavigate(params.row.data.id);
		} else {
			onDocumentPreview(params.row.data);
		}
	};

	// Create columns with system indicator support
	const columns: GridColDef<GridRow>[] = useMemo(
		() => [
			{
				headerName: 'Name',
				field: 'name',
				flex: 1,
				renderCell: ({ row }) => {
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
										<span style={{ color: 'var(--text-secondary)' }}>
											{row.data.user_email}
										</span>
									)}
								</div>
							</div>
						);
					}

					// For system folders in admin mode, show system icon
					if (adminMode && row.type === 'folder' && row.data.system) {
						return (
							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								<IconSettings size={20} style={{ color: 'var(--text-accent)' }} />
								<span style={{ color: 'var(--text-accent)' }}>
									{row.data.name}
								</span>
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
							<span>
								{row.type === 'folder' ? row.data.name : row.data.title || row.data.alias}
							</span>
						</div>
					);
				},
				renderHeader: (params) => (
					<IconHeaderCell
						{...(params as any)}
						icon={<IconFile style={{ color: 'var(--text-muted)' }} />}
					/>
				),
			},
			{
				headerName: 'Type',
				field: 'type',
				width: 150,
				renderCell: ({ row }) => {
					if (row.type === 'folder') {
						// Show "User Folder" for user-specific folders
						if (row.data.group_type === 'user') {
							return (
								<span style={{ color: 'var(--text-secondary)' }}>
									User Folder
								</span>
							);
						}
						// Show "System Folder" for system folders in admin mode
						if (adminMode && row.data.system) {
							return (
								<span style={{ color: 'var(--text-accent)' }}>
									System Folder
								</span>
							);
						}
						return (
							<span style={{ color: 'var(--text-secondary)' }}>
								Folder
							</span>
						);
					}
					return (
						<span style={{ color: 'var(--text-secondary)' }}>
							{capitalize(row.data.doc_type.replace('_', ' '))}
						</span>
					);
				},
			},
			{
				headerName: 'Date',
				field: 'date',
				width: 150,
				renderCell: ({ row }) => (
					<span style={{ color: 'var(--text-secondary)' }}>
						{formatMDY(row.data.created_at)}
					</span>
				),
			},
			{
				headerName: 'Size',
				field: 'size',
				width: 120,
				renderCell: ({ row }) => {
					if (row.type === 'document' && row.data.file_size) {
						const sizeInKB = Number(row.data.file_size) / 1024;
						return (
							<span style={{ color: 'var(--text-secondary)' }}>
								{sizeInKB.toFixed(1)} KB
							</span>
						);
					}
					return (
						<span style={{ color: 'var(--text-secondary)' }}>
							—
						</span>
					);
				},
			},
		],
		[adminMode]
	);

	return (
		<>
			{/* Breadcrumbs for navigation */}
			{showBreadcrumbs && (
				<nav style={{ padding: 16, paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
					<button
						onClick={() => onNavigate(null)}
						style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', color: currentFolderId === null ? 'var(--text-primary)' : 'var(--text-secondary)', textDecoration: 'none' }}
					>
						{breadcrumbRootLabel}
					</button>
					{parentFolder && parentFolder.id !== hiddenBreadcrumbFolderId && (
						<>
							<span style={{ color: 'var(--text-muted)' }}>/</span>
							<button
								onClick={() => onNavigate(parentFolder.id)}
								style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0, font: 'inherit', color: 'var(--text-secondary)', textDecoration: 'none' }}
							>
								{parentFolder.name}
							</button>
						</>
					)}
					{currentFolder && currentFolder.id !== hiddenBreadcrumbFolderId && (
						<>
							<span style={{ color: 'var(--text-muted)' }}>/</span>
							<span style={{ color: 'var(--text-primary)' }}>{currentFolder.name}</span>
						</>
					)}
				</nav>
			)}

			<DataGridPro
				rows={rows}
				loading={loading}
				columns={columns}
				getRowId={(row) => `${row.type}-${row.data.id}`}
				onRowDoubleClick={handleRowDoubleClick}
				checkboxSelection={editMode}
				rowSelectionModel={selectedRows}
				onRowSelectionModelChange={onRowSelectionChange}
				slots={{
					noRowsOverlay,
				}}
				style={styles.dataGrid}
				hideFooter
			/>
		</>
	);
}

const styles = {
	dataGrid: {
		flex: 1,
		border: 'none',
		...dataGridFocusStyles,
	},
};
