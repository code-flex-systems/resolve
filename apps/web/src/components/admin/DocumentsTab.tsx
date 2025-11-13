'use client';

import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { Button, Paper, Typography } from '@mui/material';
import { GridRowSelectionModel } from '@mui/x-data-grid-pro';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import InventoryIcon from '@mui/icons-material/Inventory';
import SettingsIcon from '@mui/icons-material/Settings';
import Toolbar from '../common/Toolbar';
import { useState, useMemo } from 'react';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import CreateFolderDialog from './CreateFolderDialog';
import UploadDocumentDialog from './UploadDocumentDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import DocumentNavigationTable from './DocumentNavigationTable';

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

	// Calculate depth of current folder (0 = root, 1 = level 1, 2 = level 2)
	const currentDepth = useMemo(() => {
		const currentFolder = currentFolderId ? groups.find((g) => g.id === currentFolderId) : null;
		if (!currentFolder) return 0;
		if (!currentFolder.parent_group_id) return 1;
		return 2;
	}, [currentFolderId, groups]);

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
		const folders: any[] = [];
		const documents: any[] = [];

		selectedRows.forEach((rowId) => {
			const [type, id] = String(rowId).split('-');
			if (type === 'folder') {
				const folder = groups.find((g) => g.id === Number(id));
				if (folder) folders.push({ type: 'folder', data: folder });
			} else if (type === 'document') {
				const doc = docs.find((d) => d.id === Number(id));
				if (doc) documents.push({ type: 'document', data: doc });
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
	}, [selectedRows, groups, docs, allDocs]);

	return (
		<Paper sx={styles.container}>
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

			<DocumentNavigationTable
				groups={groups}
				docs={docs}
				currentFolderId={currentFolderId}
				onNavigate={setCurrentFolderId}
				onDocumentPreview={setPreviewDocument}
				loading={isInTransition}
				editMode={editMode}
				selectedRows={selectedRows}
				onRowSelectionChange={setSelectedRows}
				showBreadcrumbs={true}
				breadcrumbRootLabel="Documents"
				adminMode={true}
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

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '20px',
		border: 1,
		borderColor: 'divider',
	},
};
