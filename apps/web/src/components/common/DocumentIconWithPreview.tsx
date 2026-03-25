'use client';

import Tooltip from '@/components/ui/Tooltip';
import Button from '@/components/ui/Button';
import { IconPaperclip } from '@tabler/icons-react';
import { useState } from 'react';
import DocumentPreviewDialog from '../admin/DocumentPreviewDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';

interface DocumentIconWithPreviewProps {
	document: DocListItem;
	tooltipText?: string;
}

/**
 * Shows a clickable document icon that opens a preview dialog
 */
export default function DocumentIconWithPreview({
	document,
	tooltipText = 'Click to view document',
}: DocumentIconWithPreviewProps) {
	const [showPreview, setShowPreview] = useState(false);

	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation(); // Prevent triggering parent click handlers
		setShowPreview(true);
	};

	return (
		<>
			<Tooltip content={tooltipText}>
				<Button variant="icon" size="sm" onClick={handleClick}>
					<IconPaperclip size={16} style={{ color: 'var(--text-accent)' }} />
				</Button>
			</Tooltip>

			{showPreview && <DocumentPreviewDialog onClose={() => setShowPreview(false)} document={document} />}
		</>
	);
}
