'use client';

import { IconCloudDownload } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Divider from '@/components/ui/Divider';
import BasicDialog from '../common/BasicDialog';
import { formatMDY } from '@/lib/utils/utils';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';

interface DocumentPreviewDialogProps {
	onClose: () => void;
	document: DocListItem;
}

export default function DocumentPreviewDialog({ onClose, document }: DocumentPreviewDialogProps) {
	const previewUrl = `/api/download?docId=${document.id}`;
	const mimeType = document.mime_type || '';
	const isImage = mimeType.startsWith('image/');
	const isPdf = mimeType === 'application/pdf';
	const canPreview = isImage || isPdf || mimeType === 'text/plain';

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
				<span style={{ maxWidth: '80%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
					{document.title || document.alias}
				</span>
			}
			iconActions={[
				<Button variant="icon" onClick={handleDownload} style={{ marginRight: 4 }}>
					<IconCloudDownload size={20} />
				</Button>,
			]}
			onClose={onClose}
			width={900}
			maxHeight="90vh"
			showOverflow={false}
		>
			{/* Document metadata */}
			<div style={{ marginBottom: 16 }}>
				<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
					<strong>Filename:</strong> {document.filename}
				</span>
				<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
					<strong>Type:</strong> {document.doc_type.replace(/_/g, ' ')}
				</span>
				<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
					<strong>Size:</strong>{' '}
					{document.file_size ? `${(Number(document.file_size) / 1024).toFixed(1)} KB` : 'Unknown'}
				</span>
				<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
					<strong>Uploaded:</strong> {formatMDY(document.created_at)}
				</span>
				{document.description && (
					<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
						<strong>Description:</strong> {document.description}
					</span>
				)}
			</div>

			<Divider />

			{/* File preview */}
			{canPreview ? (
				<div
					style={{
						width: '100%',
						minHeight: 400,
						maxHeight: 600,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						backgroundColor: 'var(--bg-tertiary)',
						borderRadius: 4,
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
				</div>
			) : (
				<div
					style={{
						padding: 32,
						textAlign: 'center',
						backgroundColor: 'var(--bg-tertiary)',
						minHeight: 200,
						display: 'flex',
						flexDirection: 'column',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>
						Preview not available for this file type.
					</span>
					<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
						MIME Type: {document.mime_type || 'Unknown'}
					</span>
					<Button variant="icon"
						onClick={handleDownload}
						style={{
							backgroundColor: 'primary.main',
							color: 'white',
							}}
					>
						<IconCloudDownload size={20} />
					</Button>
					<span style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
						Click to download
					</span>
				</div>
			)}
		</BasicDialog>
	);
}
