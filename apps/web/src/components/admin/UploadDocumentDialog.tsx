'use client';

import { IconFileUpload } from '@tabler/icons-react';
import Dropdown from '@/components/ui/Dropdown';
import Input, { Textarea } from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import BasicDialog from '../common/BasicDialog';
import { useForm, Controller } from 'react-hook-form';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { DocType, DocStatus } from '@/config/enums';
import { useState } from 'react';
import { IMAGE_EXTENSIONS, IMAGE_MIME_TYPES, getAllowedExtensions, validateFileType } from '@/config/allowedFileTypes';

type UploadDocumentFormInputs = {
	alias: string;
	title?: string;
	description?: string;
	doc_type: DocType;
	doc_status: DocStatus;
};

interface UploadDocumentDialogProps {
	onClose: () => void;
	currentFolderId?: number | null;
}

export default function UploadDocumentDialog({ onClose, currentFolderId = null }: UploadDocumentDialogProps) {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const { mutateAsync: createDoc, isPending } = useDocTrpc().createDoc;
	const {
		register,
		handleSubmit,
		control,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<UploadDocumentFormInputs>({
		defaultValues: {
			doc_type: DocType.OTHER,
			doc_status: DocStatus.APPROVED,
		},
	});
	const alias = watch('alias');
	const docType = watch('doc_type');

	// Check if selected file is an image
	const isFileImage = selectedFile
		? IMAGE_EXTENSIONS.includes('.' + selectedFile.name.split('.').pop()?.toLowerCase()) ||
			IMAGE_MIME_TYPES.includes(selectedFile.type)
		: false;

	// Determine file accept attribute based on doc type
	const fileAccept = docType === DocType.PHOTO ? IMAGE_EXTENSIONS.join(',') : undefined;

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Validate file type on client side
			const validation = validateFileType(file.name, file.type);
			if (!validation.valid) {
				alert(validation.reason || 'Invalid file type');
				event.target.value = ''; // Clear the input
				return;
			}
			setSelectedFile(file);
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		if (!selectedFile) {
			alert('Please select a file to upload');
			return;
		}

		try {
			// Step 1: Upload file to Azure Blob Storage via API route
			const formData = new FormData();
			formData.append('file', selectedFile);

			const uploadResponse = await fetch('/api/upload', {
				method: 'POST',
				body: formData,
			});

			if (!uploadResponse.ok) {
				const error = await uploadResponse.json();
				throw new Error(error.error || 'Upload failed');
			}

			const uploadResult = await uploadResponse.json();

			// Step 2: Create document record in database with storage key
			// Sanitize filename to remove problematic Unicode characters (like U+202F narrow no-break space from macOS screenshots)
			const sanitizedFilename = selectedFile.name.replace(/[^\x20-\x7E]/g, '_');

			await createDoc({
				params: {
					filename: sanitizedFilename,
					alias: data.alias,
					title: data.title,
					description: data.description,
					doc_type: data.doc_type,
					doc_status: data.doc_status,
					doc_group_id: currentFolderId || undefined,
					file_size: selectedFile.size,
					mime_type: selectedFile.type || 'application/octet-stream',
				},
				storageKey: uploadResult.storageKey,
			});

			onClose();
		} catch (e) {
			console.error(e);
			alert(`Failed to upload document: ${e instanceof Error ? e.message : 'Unknown error'}`);
		}
	});

	return (
		<BasicDialog
			title="Upload Document"
			primaryAction={{
				label: 'Upload',
				onClick: onSubmit,
				icon: <IconFileUpload size={20} />,
				disabled: !alias || !selectedFile || isSubmitting || isPending,
			}}
			onClose={onClose}
			width={550}
		>
			<span style={{ fontSize: 13 }}>
				Select a file and provide information about the document.
			</span>
			<form>
				<div style={{ marginBottom: 16 }}>
					<label style={{ display: 'block' }}>
						<Button variant="outlined" fullWidth>
							{selectedFile ? selectedFile.name : 'Choose File'}
						</Button>
						<input
							type="file"
							hidden
							onChange={handleFileChange}
							accept={fileAccept || getAllowedExtensions().join(',')}
						/>
					</label>
					{selectedFile && (
						<span style={{ fontSize: 12,  color: 'var(--text-secondary)', marginTop: 8  }}>
							Size: {(selectedFile.size / 1024).toFixed(1)} KB
						</span>
					)}
					{!selectedFile && (
						<span style={{ fontSize: 11,  color: 'var(--text-secondary)', marginTop: 8  }}>
							Accepted formats: PDF, Word, Excel, PowerPoint, images, text files, and archives
						</span>
					)}
				</div>

				<Input
					id="alias"
					label="Document Name"
					placeholder="e.g., Police Report - Case 12345"
					fullWidth
					error={!!errors.alias}
					errorText={errors.alias?.message}
					style={{ marginBottom: 24 }}
					{...register('alias', { required: 'Document name is required' })}
				/>

				<div style={{ marginBottom: 16 }}>
					<Controller
						name="doc_type"
						control={control}
						render={({ field }) => (
							<Dropdown
								label="Document Type"
								options={[
									{ value: DocType.POLICE_REPORT, label: 'Police Report' },
									{ value: DocType.MEDICAL_RECORD, label: 'Medical Record' },
									{ value: DocType.INVOICE, label: 'Invoice' },
									{ value: DocType.CORRESPONDENCE, label: 'Correspondence' },
									{ value: DocType.SETTLEMENT, label: 'Settlement' },
									{ value: DocType.PHOTO, label: 'Photo', disabled: selectedFile !== null && !isFileImage },
									{ value: DocType.ESTIMATE, label: 'Estimate' },
									{ value: DocType.REPAIR_INVOICE, label: 'Repair Invoice' },
									{ value: DocType.PROOF_OF_PAYMENT, label: 'Proof of Payment' },
									{ value: DocType.DEMAND_LETTER, label: 'Demand Letter' },
									{ value: DocType.LEGAL_FILING, label: 'Legal Filing' },
									{ value: DocType.OTHER, label: 'Other' },
								]}
								value={field.value}
								onChange={(v) => field.onChange(v)}
								name={field.name}
								fullWidth
							/>
						)}
					/>
				</div>

				<Input
					id="title"
					label="Title (optional)"
					placeholder="Brief title"
					fullWidth
					error={!!errors.title}
					errorText={errors.title?.message}
					{...register('title')}
					style={{ marginBottom: 24 }}
				/>

				<Textarea
					id="description"
					label="Description (optional)"
					placeholder="Additional details about this document"
					fullWidth
					rows={3}
					error={!!errors.description}
					errorText={errors.description?.message}
					{...register('description')}
				/>
			</form>
		</BasicDialog>
	);
}

const styles = {
	selectOverrides: {
		width: 300,
		padding: '2px 10px',
		},
	textFieldOverrides: {
		},
};
