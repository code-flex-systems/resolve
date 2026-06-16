'use client';

import { IconAlertTriangle, IconTrash } from '@tabler/icons-react';
import BasicDialog from '../common/BasicDialog';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';

type FolderRow = { type: 'folder'; data: DocGroupListItem };
type DocumentRow = { type: 'document'; data: DocListItem };

interface DeleteConfirmationDialogProps {
	onClose: () => void;
	onConfirm: () => Promise<void>;
	itemsInfo: {
		folders: FolderRow[];
		documents: DocumentRow[];
		docsInFolders: number;
		totalDocs: number;
	};
}

export default function DeleteConfirmationDialog({
	onClose,
	onConfirm,
	itemsInfo,
}: DeleteConfirmationDialogProps) {
	const { folders, documents, docsInFolders, totalDocs } = itemsInfo;
	const hasNonEmptyFolders = folders.length > 0 && docsInFolders > 0;

	const handleConfirm = async () => {
		await onConfirm();
		onClose();
	};

	return (
		<BasicDialog
			title="Delete Items"
			primaryAction={{
				label: 'Delete',
				onClick: handleConfirm,
				icon: <IconTrash size={20} />,
				color: 'error',
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={450}
		>
			{hasNonEmptyFolders && (
				<div
					style={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 8,
						marginBottom: 16,
						padding: 12,
						backgroundColor: 'var(--status-warning-bg)',
						borderRadius: 4,
					}}
				>
					<IconAlertTriangle size={20} style={{ color: 'var(--status-warning)', marginTop: 4 }} />
					<div>
						<span
							style={{
								fontSize: 13,
								fontWeight: 600,
								color: 'var(--status-warning)',
								display: 'block',
								marginBottom: 4,
							}}
						>
							Warning: Non-empty folders
						</span>
						<span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-warning)' }}>
							You are about to delete {docsInFolders} document{docsInFolders !== 1 ? 's' : ''}{' '}
							contained in the selected folder{folders.length !== 1 ? 's' : ''}.
						</span>
					</div>
				</div>
			)}

			<p style={{ fontSize: 13, marginBottom: 16 }}>
				Are you sure you want to delete the following items?
			</p>

			<div style={{ marginBottom: 16 }}>
				{folders.length > 0 && (
					<div style={{ marginBottom: 8 }}>
						<span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
							Folders ({folders.length}):
						</span>
						<ul style={{ margin: '4px 0', paddingLeft: 20 }}>
							{folders.map((folder) => (
								<li key={folder.data.id}>
									<span style={{ fontSize: 'var(--text-xs)' }}>{folder.data.name}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{documents.length > 0 && (
					<div>
						<span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary)' }}>
							Documents ({documents.length}):
						</span>
						<ul style={{ margin: '4px 0', paddingLeft: 20 }}>
							{documents.map((doc) => (
								<li key={doc.data.id}>
									<span style={{ fontSize: 'var(--text-xs)' }}>{doc.data.title || doc.data.alias}</span>
								</li>
							))}
						</ul>
					</div>
				)}
			</div>

			<span style={{ fontSize: 'var(--text-xs)', color: 'var(--status-error)', fontWeight: 600 }}>
				This action cannot be undone.
				{totalDocs > 0 &&
					` ${totalDocs} document${totalDocs !== 1 ? 's' : ''} will be permanently deleted.`}
			</span>
		</BasicDialog>
	);
}
