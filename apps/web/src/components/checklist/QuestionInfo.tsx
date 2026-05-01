'use client';
import './styles.css';
import Tooltip from '@/components/ui/Tooltip';
import { useRef, useState } from 'react';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import ImageTooltip from '../common/ImageTooltip';
import DocumentIconWithPreview from '../common/DocumentIconWithPreview';
import { IconInfoCircle } from '@tabler/icons-react';
import BasicPopper from '../common/BasicPopper';

export default function QuestionInfo(props: {
	description: string | null;
	filename: string | null;
	questionId: string;
}) {
	const { description, questionId } = props;
	const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

	// Fetch attached document for this question
	const { data: attachedDocsResult } = useDocTrpc().listDocs(
		{
			filters: { question_id: questionId },
		},
		{ enabled: !!questionId }
	);
	const attachedDocs = attachedDocsResult?.rows ?? [];

	const attachedDoc = attachedDocs.length > 0 ? attachedDocs[0] : null;

	return (
		<>
			{/* Show info icon with description tooltip if there's a description */}
			{description && (
				<>
					<Tooltip content={description} position="top">
						<IconInfoCircle
							onMouseEnter={(e) => setAnchorEl(e.currentTarget as unknown as HTMLElement)}
							onMouseLeave={() => setAnchorEl(null)}
							style={{ color: 'var(--text-accent)', marginLeft: '10px' }}
							className="info"
						/>
					</Tooltip>

					<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="right" zIndex={100}>
						<div
							style={{
								width: 250,
								height: 'fit-content',
								display: 'flex',
								flexDirection: 'column',
								justifyContent: 'flex-start',
								alignItems: 'flex-start',
								padding: 10,
								marginTop: 5,
								backgroundColor: 'var(--bg-primary)',
								borderRadius: 'var(--radius-lg)',
								boxShadow: 'var(--shadow-md)',
							}}
						>
							<span style={{ fontSize: 17, fontWeight: 'bold' }}>{description}</span>
						</div>
					</BasicPopper>
				</>
			)}

			{/* Show attached document/image */}
			{attachedDoc && (
				<div style={{ display: 'inline-flex', marginLeft: description ? 0 : 1 }}>
					{attachedDoc.mime_type?.startsWith('image/') ? (
						<ImageTooltip
							imageUrl={`/api/download?docId=${attachedDoc.id}`}
							description={attachedDoc.title ?? undefined}
						/>
					) : (
						<DocumentIconWithPreview document={attachedDoc} />
					)}
				</div>
			)}
		</>
	);
}
