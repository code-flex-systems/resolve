'use client';

import { Box, IconButton, Typography, Paper, Divider } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import CloseIcon from '@mui/icons-material/Close';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import { formatMDY } from '@/lib/utils/utils';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useMemo } from 'react';

interface DocumentPreviewDialogProps {
	onClose: () => void;
	document: DocListItem;
}

export default function DocumentPreviewDialog({ onClose, document }: DocumentPreviewDialogProps) {
	const previewUrl = `/api/download?docId=${document.id}`;

	// Determine if file can be previewed
	const canPreview = useMemo(() => {
		const mimeType = document.mime_type || '';
		return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType === 'text/plain';
	}, [document.mime_type]);

	const isImage = document.mime_type?.startsWith('image/');
	const isPdf = document.mime_type === 'application/pdf';

	const handleDownload = () => {
		// Trigger download by opening in new tab with download disposition
		const link = window.document.createElement('a');
		link.href = previewUrl;
		link.download = document.filename;
		window.document.body.appendChild(link);
		link.click();
		window.document.body.removeChild(link);
	};

	return (
		<BasicDialog
			title={
				<Typography variant="h6" noWrap sx={{ maxWidth: '80%' }}>
					{document.title || document.alias}
				</Typography>
			}
			iconActions={[
				<IconButton onClick={handleDownload} sx={{ marginRight: '5px' }}>
					<CloudDownloadIcon />
				</IconButton>,
			]}
			onClose={onClose}
			width={900}
			maxHeight="90vh"
			showOverflow={false}
		>
			{/* Document metadata */}
			<Box mb={2}>
				<Typography fontSize={12} color="text.secondary">
					<strong>Filename:</strong> {document.filename}
				</Typography>
				<Typography fontSize={12} color="text.secondary">
					<strong>Type:</strong> {document.doc_type.replace(/_/g, ' ')}
				</Typography>
				<Typography fontSize={12} color="text.secondary">
					<strong>Size:</strong>{' '}
					{document.file_size ? `${(Number(document.file_size) / 1024).toFixed(1)} KB` : 'Unknown'}
				</Typography>
				<Typography fontSize={12} color="text.secondary">
					<strong>Uploaded:</strong> {formatMDY(document.created_at)}
				</Typography>
				{document.description && (
					<Typography fontSize={12} color="text.secondary">
						<strong>Description:</strong> {document.description}
					</Typography>
				)}
			</Box>

			<Divider sx={{ mb: 2 }} />

			{/* File preview */}
			{canPreview ? (
				<Box
					sx={{
						width: '100%',
						minHeight: 400,
						maxHeight: 600,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						bgcolor: '#f5f5f5',
						borderRadius: 1,
						overflow: 'hidden',
					}}
				>
					{isImage && (
						<img
							src={previewUrl}
							alt={document.title || document.alias}
							style={{
								maxWidth: '100%',
								maxHeight: '100%',
								objectFit: 'contain',
							}}
						/>
					)}
					{isPdf && (
						<iframe
							src={previewUrl}
							title={document.title || document.alias}
							style={{
								width: '100%',
								height: 600,
								border: 'none',
							}}
						/>
					)}
				</Box>
			) : (
				<Paper
					elevation={0}
					sx={{
						p: 4,
						textAlign: 'center',
						bgcolor: '#f5f5f5',
						minHeight: 200,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<Typography fontSize={14} color="text.secondary" mb={2}>
						Preview not available for this file type.
					</Typography>
					<Typography fontSize={12} color="text.secondary" mb={3}>
						MIME Type: {document.mime_type || 'Unknown'}
					</Typography>
					<IconButton
						onClick={handleDownload}
						sx={{
							bgcolor: 'primary.main',
							color: 'white',
							'&:hover': { bgcolor: 'primary.dark' },
						}}
					>
						<CloudDownloadIcon />
					</IconButton>
					<Typography fontSize={12} color="text.secondary" mt={1}>
						Click to download
					</Typography>
				</Paper>
			)}
		</BasicDialog>
	);
}
