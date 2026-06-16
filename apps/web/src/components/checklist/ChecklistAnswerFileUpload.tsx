'use client';
import Button from '@/components/ui/Button';
import { Answer } from '@/types/types';
import { ControllerRenderProps, FieldValues } from 'react-hook-form';
import { useState, useEffect } from 'react';
import DocumentSelectorDialog from '../admin/DocumentSelectorDialog';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { useSession } from '@/lib/auth/use-session';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { IconUpload, IconX } from '@tabler/icons-react';

interface ChecklistAnswerFileUploadProps {
	field: ControllerRenderProps<FieldValues, string>;
	answer?: Answer;
	disabled?: boolean;
	allowedExtensions?: string | null;
}

export default function ChecklistAnswerFileUpload(props: ChecklistAnswerFileUploadProps) {
	const { field, answer, disabled, allowedExtensions } = props;
	const { data: session } = useSession();
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const [showDocSelector, setShowDocSelector] = useState(false);
	const [attachedDoc, setAttachedDoc] = useState<DocListItem | null>(null);

	const { data: doc } = useDocTrpc().getDoc({ docId: field.value }, { enabled: !!field.value });

	// Sync attached document when doc is fetched or field value changes
	useEffect(() => {
		if (doc && field.value) {
			setAttachedDoc(doc);
		} else if (!field.value) {
			setAttachedDoc(null);
		}
	}, [doc, field.value]);

	if (!answer) return <></>;

	const handleSelectDoc = (doc: DocListItem) => {
		// Security check for non-admin users: verify they created the document
		if (!isAdmin && !isSuperAdmin && doc.created_by !== session?.user.id) {
			alert('You can only link documents that you uploaded.');
			return;
		}

		// Update the field value with the document id
		// The actual linking to the response will happen when the form is submitted
		field.onChange(doc.id);
		setAttachedDoc(doc);
		setShowDocSelector(false);
	};

	const handleRemoveDoc = () => {
		if (!attachedDoc) return;
		field.onChange(null);
		setAttachedDoc(null);
	};

	// Parse allowed extensions for validation
	const allowedExtensionsArray = allowedExtensions
		? allowedExtensions.split(',').filter(Boolean)
		: null;

	return (
		<>
			<div
				style={{
					...{ marginTop: '5px', padding: '0px 10px' },
					display: 'flex',
					alignItems: 'center',
					gap: 8,
				}}
			>
				<Button
					variant="outlined"
					size="sm"
					startIcon={<IconUpload size={20} />}
					onClick={() => setShowDocSelector(true)}
					disabled={disabled}
				>
					{attachedDoc ? 'Change File' : 'Upload File...'}
				</Button>
				{attachedDoc && (
					<div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8 }}>
						<span style={{ fontSize: 'var(--text-xs)', color: 'text.secondary' }}>
							{attachedDoc.title || attachedDoc.alias}
						</span>
						<Button variant="icon" size="sm" onClick={handleRemoveDoc} disabled={disabled}>
							<IconX size={16} />
						</Button>
					</div>
				)}
				{!attachedDoc && <span style={{ fontSize: 'var(--text-xs)', color: 'error.main' }}>Required</span>}
			</div>

			{showDocSelector && (
				<DocumentSelectorDialog
					onClose={() => setShowDocSelector(false)}
					onSelect={handleSelectDoc}
					userFilteredMode={!isAdmin && !isSuperAdmin}
					userId={session?.user.id}
					allowedExtensions={allowedExtensionsArray}
					autoOrganize={true}
				/>
			)}
		</>
	);
}
