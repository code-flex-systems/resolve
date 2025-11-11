'use client';

import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { Button, Breadcrumbs, Link, Paper, Typography } from '@mui/material';
import { DataGridPro, GridColDef, GridRowParams, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsIcon from '@mui/icons-material/Settings';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { capitalize, formatMDY } from '@/lib/utils/utils';
import { useState, useMemo } from 'react';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';
import CreateFolderDialog from './CreateFolderDialog';
import UploadDocumentDialog from './UploadDocumentDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import DocumentPreviewDialog from './DocumentPreviewDialog';

type GridRow = { type: 'folder'; data: DocGroupListItem } | { type: 'document'; data: DocListItem };

export default function DocumentsTab() {
	const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
	const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
	const [showUploadDocumentDialog, setShowUploadDocumentDialog] = useState(false);
	const [selectedRows, setSelectedRows] = useState<GridRowSelectionModel>([]);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [previewDocument, setPreviewDocument] = useState<DocListItem | null>(null);

	const { data: groups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();
	const { data: docs = [], isFetching: isFetchingDocs } = useDocTrpc().listDocs({
		filters: { doc_group_id: currentFolderId },
	});
	const { data: allDocs = [], isFetching: isFetchingAllDocs } = useDocTrpc().listDocs({}); // Fetch all docs for counting
	const { mutateAsync: deleteDoc } = useDocTrpc().deleteDoc;
	const { mutateAsync: deleteDocGroup } = useDocTrpc().deleteDocGroup;
	const isInTransition = isFetchingAllDocs || isFetchingDocs || isFetchingGroups;

	// Get current folder for breadcrumbs
	const currentFolder = useMemo(() => {
		return currentFolderId ? groups.find((g) => g.id === currentFolderId) : null;
	}, [currentFolderId, groups]);

	// Get parent folder for breadcrumbs (for two-level navigation)
	const parentFolder = useMemo(() => {
		if (!currentFolder?.parent_group_id) return null;
		return groups.find((g) => g.id === currentFolder.parent_group_id) || null;
	}, [currentFolder, groups]);

	// Calculate depth of current folder (0 = root, 1 = level 1, 2 = level 2)
	const currentDepth = useMemo(() => {
		if (!currentFolder) return 0;
		if (!currentFolder.parent_group_id) return 1;
		return 2;
	}, [currentFolder]);

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
		if (params.row.type === 'folder') {
			setCurrentFolderId(params.row.data.id);
		} else {
			// Open document preview
			setPreviewDocument(params.row.data);
		}
	};

	const handleAddFolder = () => {
		setShowCreateFolderDialog(true);
	};

	const handleAddDocument = () => {
		setShowUploadDocumentDialog(true);
	};

	const handleDelete = () => {
		setShowDeleteDialog(true);
	};

	const handleToggleEditMode = () => {
		setEditMode(!editMode);
		if (editMode) {
			// Exit edit mode - clear selection
			setSelectedRows([]);
		}
	};

	const handleConfirmDelete = async () => {
		try {
			for (const rowId of selectedRows) {
				const [type, id] = String(rowId).split('-');
				if (type === 'folder') {
					await deleteDocGroup({ groupId: Number(id) });
				} else if (type === 'document') {
					await deleteDoc({ docId: Number(id) });
				}
			}
			setSelectedRows([]);
			setShowDeleteDialog(false);
		} catch (e) {
			console.error('Delete failed:', e);
			alert(`Failed to delete: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}
	};

	// Get info about selected items for delete confirmation
	const selectedItemsInfo = useMemo(() => {
		const folders: GridRow[] = [];
		const documents: GridRow[] = [];

		selectedRows.forEach((rowId) => {
			const row = rows.find((r) => `${r.type}-${r.data.id}` === rowId);
			if (row) {
				if (row.type === 'folder') {
					folders.push(row);
				} else {
					documents.push(row);
				}
			}
		});

		// Count docs in selected folders using all docs
		let docsInFolders = 0;
		folders.forEach((folder) => {
			const folderDocs = allDocs.filter((d) => d.doc_group_id === folder.data.id);
			docsInFolders += folderDocs.length;
		});

		return {
			folders,
			documents,
			docsInFolders,
			totalDocs: documents.length + docsInFolders,
		};
	}, [selectedRows, rows, allDocs]);

	return (
		<Paper elevation={0} sx={styles.container}>
			<Toolbar
				left={<Typography variant="h6">Documents</Typography>}
				right={
					<div style={{ display: 'flex', gap: 8 }}>
						{editMode ? (
							<>
								{selectedRows.length > 0 && (
									<Button
										variant="outlined"
										color="error"
										startIcon={<InventoryIcon />}
										onClick={handleDelete}
									>
										Archive ({selectedRows.length})
									</Button>
								)}
								<Button variant="outlined" onClick={handleToggleEditMode}>
									Done
								</Button>
							</>
						) : (
							<>
								<Button variant="outlined" startIcon={<SettingsIcon />} onClick={handleToggleEditMode}>
									Manage
								</Button>
								<Button
									variant="outlined"
									startIcon={<CreateNewFolderIcon />}
									onClick={handleAddFolder}
									disabled={currentDepth >= 2} // Allow up to 2 levels (root + 2 levels of folders)
								>
									Add Folder
								</Button>
								<Button variant="contained" startIcon={<UploadFileIcon />} onClick={handleAddDocument}>
									Add Document
								</Button>
							</>
						)}
					</div>
				}
			/>

			{/* Breadcrumbs for navigation */}
			<Breadcrumbs sx={{ p: 2, pb: 1 }}>
				<Link
					component="button"
					underline="hover"
					color={currentFolderId === null ? 'text.primary' : 'inherit'}
					onClick={() => setCurrentFolderId(null)}
					sx={{ cursor: 'pointer' }}
				>
					Documents
				</Link>
				{parentFolder && (
					<Link
						component="button"
						underline="hover"
						color="inherit"
						onClick={() => setCurrentFolderId(parentFolder.id)}
						sx={{ cursor: 'pointer' }}
					>
						{parentFolder.name}
					</Link>
				)}
				{currentFolder && <Typography color="text.primary">{currentFolder.name}</Typography>}
			</Breadcrumbs>

			<DataGridPro
				rows={rows}
				loading={isInTransition}
				columns={COLUMNS}
				getRowId={(row) => `${row.type}-${row.data.id}`}
				onRowDoubleClick={editMode ? undefined : handleRowDoubleClick}
				checkboxSelection={editMode}
				rowSelectionModel={selectedRows}
				onRowSelectionModelChange={setSelectedRows}
				slots={{
					noRowsOverlay: () => (
						<CustomNoRowsOverlay
							text={
								currentFolderId === null
									? 'No folders or documents yet. Click "Add Folder" or "Add Document" to get started.'
									: 'No documents in this folder yet. Click "Add Document" to upload.'
							}
							icon={<InsertDriveFileIcon style={{ fontSize: 40, color: BASE_COLOR_LIGHT }} />}
						/>
					),
				}}
				sx={styles.dataGrid}
				hideFooter
			/>

			{showCreateFolderDialog && (
				<CreateFolderDialog onClose={() => setShowCreateFolderDialog(false)} parentGroupId={currentFolderId} />
			)}

			{showUploadDocumentDialog && (
				<UploadDocumentDialog
					onClose={() => setShowUploadDocumentDialog(false)}
					currentFolderId={currentFolderId}
				/>
			)}

			{showDeleteDialog && (
				<DeleteConfirmationDialog
					onClose={() => setShowDeleteDialog(false)}
					onConfirm={handleConfirmDelete}
					itemsInfo={selectedItemsInfo}
				/>
			)}

			{previewDocument && (
				<DocumentPreviewDialog onClose={() => setPreviewDocument(null)} document={previewDocument} />
			)}
		</Paper>
	);
}

const COLUMNS: GridColDef<GridRow>[] = [
	{
		headerName: 'Name',
		field: 'name',
		flex: 1,
		renderCell: ({ row }) => {
			// For user folders, display user's full name and email
			if (row.type === 'folder' && row.data.group_type === 'user' && row.data.user_first && row.data.user_last) {
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
			<IconHeaderCell {...(params as any)} icon={<InsertDriveFileIcon style={{ color: BASE_COLOR_LIGHT }} />} />
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
];

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '20px',
	},
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
