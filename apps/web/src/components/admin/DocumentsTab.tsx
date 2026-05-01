'use client';

import { IconFileUpload, IconFolderPlus, IconPackage, IconSettings } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import Toolbar from '../common/Toolbar';
import { useState, useMemo, useEffect } from 'react';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useBreadcrumbs } from '@/components/common/BreadcrumbContext';
import CreateFolderDialog from './CreateFolderDialog';
import UploadDocumentDialog from './UploadDocumentDialog';
import DeleteConfirmationDialog from './DeleteConfirmationDialog';
import DocumentPreviewDialog from './DocumentPreviewDialog';
import DocumentNavigationTable from './DocumentNavigationTable';

export default function DocumentsTab() {
	const { setDynamicSegments, setSegments } = useBreadcrumbs();
	const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
	const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
	const [showUploadDocumentDialog, setShowUploadDocumentDialog] = useState(false);
	const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [editMode, setEditMode] = useState(false);
	const [previewDocument, setPreviewDocument] = useState<DocListItem | null>(null);

	const { data: groups = [], isFetching: isFetchingGroups } = useDocTrpc().listDocGroups();
	const { data: docsResult, isFetching: isFetchingDocs } = useDocTrpc().listDocs({
		filters: { doc_group_id: currentFolderId },
	});
	const docs = docsResult?.rows ?? [];

	// Get all group IDs for batch count query
	const groupIds = useMemo(() => groups.map((g) => g.id), [groups]);
	const { data: docCounts = [], isFetching: isFetchingCounts } =
		useDocTrpc().getDocCountsByGroupIds({ groupIds }, { enabled: groupIds.length > 0 });

	const { mutateAsync: deleteDoc } = useDocTrpc().deleteDoc;
	const { mutateAsync: deleteDocGroup } = useDocTrpc().deleteDocGroup;
	const isInTransition = isFetchingCounts || isFetchingDocs || isFetchingGroups;

	// Calculate depth of current folder (0 = root, 1 = level 1, 2 = level 2)
	const currentDepth = useMemo(() => {
		const currentFolder = currentFolderId ? groups.find((g) => g.id === currentFolderId) : null;
		if (!currentFolder) return 0;
		if (!currentFolder.parent_group_id) return 1;
		return 2;
	}, [currentFolderId, groups]);

	// Build folder breadcrumb path for the app header
	const currentFolder = useMemo(() => {
		return currentFolderId ? groups.find((g) => g.id === currentFolderId) : null;
	}, [currentFolderId, groups]);

	const parentFolder = useMemo(() => {
		if (!currentFolder?.parent_group_id) return null;
		return groups.find((g) => g.id === currentFolder.parent_group_id) ?? null;
	}, [currentFolder, groups]);

	useEffect(() => {
		const segments: { label: string; onClick?: () => void }[] = [
			{ label: 'Admin', href: '/admin' } as any,
			{ label: 'Documents', onClick: () => setCurrentFolderId(null) },
		];
		if (parentFolder) {
			const folderId = parentFolder.id;
			segments.push({ label: parentFolder.name, onClick: () => setCurrentFolderId(folderId) });
		}
		if (currentFolder) {
			segments.push({ label: currentFolder.name });
		}
		setSegments(segments);
	}, [currentFolder?.name, parentFolder?.name, setSegments]);

	// Build doc counts map from server-side batch query
	const docCountsByFolder = useMemo(() => {
		const map = new Map<string, number>();
		docCounts.forEach((r) => {
			if (r.doc_group_id !== null) {
				map.set(r.doc_group_id, Number(r.count));
			}
		});
		return map;
	}, [docCounts]);

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
			setSelectedRows({});
		}
	};

	const handleConfirmDelete = async () => {
		try {
			const selectedKeys = Object.keys(selectedRows).filter((k) => selectedRows[k]);
			for (const rowId of selectedKeys) {
				const [type, id] = String(rowId).split('-');
				if (type === 'folder') {
					await deleteDocGroup({ groupId: id });
				} else if (type === 'document') {
					await deleteDoc({ docId: id });
				}
			}
			setSelectedRows({});
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

		const selectedKeys = Object.keys(selectedRows).filter((k) => selectedRows[k]);
		selectedKeys.forEach((rowId) => {
			const [type, id] = String(rowId).split('-');
			if (type === 'folder') {
				const folder = groups.find((g) => g.id === id);
				if (folder) folders.push({ type: 'folder', data: folder });
			} else if (type === 'document') {
				const doc = docs.find((d) => d.id === id);
				if (doc) documents.push({ type: 'document', data: doc });
			}
		});

		// Count docs in selected folders using pre-computed counts
		let docsInFolders = 0;
		folders.forEach((folder) => {
			docsInFolders += docCountsByFolder.get(folder.data.id) ?? 0;
		});

		return {
			folders,
			documents,
			docsInFolders,
			totalDocs: documents.length + docsInFolders,
		};
	}, [selectedRows, groups, docs, docCountsByFolder]);

	return (
		<Card variant="beveled" padding="md" style={styles.container}>
			<p
				style={{
					color: 'var(--text-secondary)',
					fontSize: 13,
					margin: '0 0 12px',
					lineHeight: 1.5,
				}}
			>
				Manage claim documents and files. Organize documents into folders and track document status.
			</p>
			<Toolbar
				left={undefined}
				right={
					<div style={{ display: 'flex', gap: 8 }}>
						{editMode ? (
							<>
								{Object.keys(selectedRows).filter((k) => selectedRows[k]).length > 0 && (
									<Button
										variant="outlined"
										color="error"
										startIcon={<IconPackage size={20} />}
										onClick={handleDelete}
									>
										Archive ({Object.keys(selectedRows).filter((k) => selectedRows[k]).length})
									</Button>
								)}
								<Button variant="outlined" onClick={handleToggleEditMode}>
									Done
								</Button>
							</>
						) : (
							<>
								<Button
									variant="outlined"
									startIcon={<IconSettings size={20} />}
									onClick={handleToggleEditMode}
								>
									Manage
								</Button>
								<Button
									variant="outlined"
									startIcon={<IconFolderPlus size={20} />}
									onClick={handleAddFolder}
									disabled={currentDepth >= 2} // Allow up to 2 levels (root + 2 levels of folders)
								>
									Add Folder
								</Button>
								<Button
									variant="contained"
									startIcon={<IconFileUpload size={20} />}
									onClick={handleAddDocument}
								>
									Add Document
								</Button>
							</>
						)}
					</div>
				}
			/>

			<div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
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
					adminMode={true}
				/>
			</div>

			{showCreateFolderDialog && (
				<CreateFolderDialog
					onClose={() => setShowCreateFolderDialog(false)}
					parentGroupId={currentFolderId}
				/>
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
				<DocumentPreviewDialog
					onClose={() => setPreviewDocument(null)}
					document={previewDocument}
				/>
			)}
		</Card>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
		overflow: 'hidden',
	},
};
