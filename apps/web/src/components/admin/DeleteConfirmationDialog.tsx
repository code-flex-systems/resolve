'use client';

import { Typography, Box } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import DeleteIcon from '@mui/icons-material/Delete';
import WarningIcon from '@mui/icons-material/Warning';
import type { DocGroupListItem, DocListItem } from '@/hooks/trpc/useDocTrpc';

type GridRow = { type: 'folder'; data: DocGroupListItem } | { type: 'document'; data: DocListItem };

interface DeleteConfirmationDialogProps {
	onClose: () => void;
	onConfirm: () => Promise<void>;
	itemsInfo: {
		folders: GridRow[];
		documents: GridRow[];
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
				icon: <DeleteIcon />,
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
				<Box
					sx={{
						display: 'flex',
						alignItems: 'flex-start',
						gap: 1,
						mb: 2,
						p: 1.5,
						bgcolor: 'warning.light',
						borderRadius: 1,
					}}
				>
					<WarningIcon sx={{ color: 'warning.main', mt: 0.5 }} />
					<Box>
						<Typography fontSize={13} fontWeight={600} color="warning.dark" mb={0.5}>
							Warning: Non-empty folders
						</Typography>
						<Typography fontSize={12} color="warning.dark">
							You are about to delete {docsInFolders} document{docsInFolders !== 1 ? 's' : ''} contained
							in the selected folder{folders.length !== 1 ? 's' : ''}.
						</Typography>
					</Box>
				</Box>
			)}

			<Typography fontSize={13} mb={2}>
				Are you sure you want to delete the following items?
			</Typography>

			<Box mb={2}>
				{folders.length > 0 && (
					<Box mb={1}>
						<Typography fontSize={12} fontWeight={600} color="text.secondary">
							Folders ({folders.length}):
						</Typography>
						<Box component="ul" sx={{ m: '4px 0', pl: 2.5 }}>
							{folders.map((folder) => (
								<li key={folder.data.id}>
									<Typography fontSize={12}>{folder.data.name}</Typography>
								</li>
							))}
						</Box>
					</Box>
				)}

				{documents.length > 0 && (
					<Box>
						<Typography fontSize={12} fontWeight={600} color="text.secondary">
							Documents ({documents.length}):
						</Typography>
						<Box component="ul" sx={{ m: '4px 0', pl: 2.5 }}>
							{documents.map((doc) => (
								<li key={doc.data.id}>
									<Typography fontSize={12}>{doc.data.title || doc.data.alias}</Typography>
								</li>
							))}
						</Box>
					</Box>
				)}
			</Box>

			<Typography fontSize={12} color="error" fontWeight={600}>
				This action cannot be undone.
				{totalDocs > 0 && ` ${totalDocs} document${totalDocs !== 1 ? 's' : ''} will be permanently deleted.`}
			</Typography>
		</BasicDialog>
	);
}
