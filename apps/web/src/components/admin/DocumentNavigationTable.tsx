'use client';

import { Breadcrumbs, Link, Typography } from '@mui/material';
import { DataGridPro, GridColDef, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import SettingsIcon from '@mui/icons-material/Settings';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { capitalize, formatMDY } from '@/lib/utils/utils';
import { useMemo } from 'react';
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
								<FolderIcon style={{ color: BASE_COLOR_LIGHT }} />
								<div>
									<Typography variant="body2">
										{row.data.user_first} {row.data.user_last}
									</Typography>
									{row.data.user_email && (
										<Typography variant="caption" color="text.secondary" display="block">
											{row.data.user_email}
										</Typography>
									)}
								</div>
							</div>
						);
					}

					// For system folders in admin mode, show system icon
					if (adminMode && row.type === 'folder' && row.data.system) {
						return (
							<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
								<SettingsIcon sx={{ color: 'primary.main', fontSize: 20 }} />
								<Typography variant="body2" color="primary">
									{row.data.name}
								</Typography>
							</div>
						);
					}

					// Default rendering for other folders and documents
					return (
						<div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
							{row.type === 'folder' ? (
								<FolderIcon style={{ color: BASE_COLOR_LIGHT }} />
							) : (
								<InsertDriveFileIcon style={{ color: BASE_COLOR_LIGHT }} />
							)}
							<Typography variant="body2">
								{row.type === 'folder' ? row.data.name : row.data.title || row.data.alias}
							</Typography>
						</div>
					);
				},
				renderHeader: (params) => (
					<IconHeaderCell
						{...(params as any)}
						icon={<InsertDriveFileIcon style={{ color: BASE_COLOR_LIGHT }} />}
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
								<Typography variant="body2" color="text.secondary">
									User Folder
								</Typography>
							);
						}
						// Show "System Folder" for system folders in admin mode
						if (adminMode && row.data.system) {
							return (
								<Typography variant="body2" color="primary">
									System Folder
								</Typography>
							);
						}
						return (
							<Typography variant="body2" color="text.secondary">
								Folder
							</Typography>
						);
					}
					return (
						<Typography variant="body2" color="text.secondary">
							{capitalize(row.data.doc_type.replace('_', ' '))}
						</Typography>
					);
				},
			},
			{
				headerName: 'Date',
				field: 'date',
				width: 150,
				renderCell: ({ row }) => (
					<Typography variant="body2" color="text.secondary">
						{formatMDY(row.data.created_at)}
					</Typography>
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
							<Typography variant="body2" color="text.secondary">
								{sizeInKB.toFixed(1)} KB
							</Typography>
						);
					}
					return (
						<Typography variant="body2" color="text.secondary">
							—
						</Typography>
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
				<Breadcrumbs sx={{ p: 2, pb: 1 }}>
					<Link
						component="button"
						underline="hover"
						color={currentFolderId === null ? 'text.primary' : 'inherit'}
						onClick={() => onNavigate(null)}
						sx={{ cursor: 'pointer' }}
					>
						{breadcrumbRootLabel}
					</Link>
					{parentFolder && parentFolder.id !== hiddenBreadcrumbFolderId && (
						<Link
							component="button"
							underline="hover"
							color="inherit"
							onClick={() => onNavigate(parentFolder.id)}
							sx={{ cursor: 'pointer' }}
						>
							{parentFolder.name}
						</Link>
					)}
					{currentFolder && currentFolder.id !== hiddenBreadcrumbFolderId && (
					<Typography color="text.primary">{currentFolder.name}</Typography>
				)}
				</Breadcrumbs>
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
					noRowsOverlay: () => (
						<CustomNoRowsOverlay
							text={currentFolderId === null ? emptyRootText : emptyFolderText}
							icon={<InsertDriveFileIcon style={{ fontSize: 40, color: BASE_COLOR_LIGHT }} />}
						/>
					),
				}}
				sx={styles.dataGrid}
				hideFooter
			/>
		</>
	);
}

const styles = {
	dataGrid: {
		flex: 1,
		border: 'none',
		'& .MuiDataGrid-row': {
			cursor: 'pointer',
		},
		'& .MuiDataGrid-cell': {
			display: 'flex',
			alignItems: 'center',
		},
	},
};
