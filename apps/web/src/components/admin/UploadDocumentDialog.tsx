'use client';

import { Button, MenuItem, Select, TextField, Typography, FormControl, InputLabel, Box } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm, Controller } from 'react-hook-form';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { DocType, DocStatus } from '@/config/enums';
import { useState, useMemo } from 'react';
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
	const isFileImage = useMemo(() => {
		if (!selectedFile) return false;
		const fileExtension = '.' + selectedFile.name.split('.').pop()?.toLowerCase();
		return IMAGE_EXTENSIONS.includes(fileExtension) || IMAGE_MIME_TYPES.includes(selectedFile.type);
	}, [selectedFile]);

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
				icon: <UploadFileIcon />,
				disabled: !alias || !selectedFile || isSubmitting || isPending,
			}}
			onClose={onClose}
			width={550}
		>
			<Typography fontSize={13} mb={2}>
				Select a file and provide information about the document.
			</Typography>
			<form>
				<Box mb={2}>
					<Button variant="outlined" component="label" fullWidth>
						{selectedFile ? selectedFile.name : 'Choose File'}
						<input
							type="file"
							hidden
							onChange={handleFileChange}
							accept={fileAccept || getAllowedExtensions().join(',')}
						/>
					</Button>
					{selectedFile && (
						<Typography fontSize={12} color="text.secondary" mt={1}>
							Size: {(selectedFile.size / 1024).toFixed(1)} KB
						</Typography>
					)}
					{!selectedFile && (
						<Typography fontSize={11} color="text.secondary" mt={1}>
							Accepted formats: PDF, Word, Excel, PowerPoint, images, text files, and archives
						</Typography>
					)}
				</Box>

				<TextField
					id="alias"
					label="Document Name"
					placeholder="e.g., Police Report - Case 12345"
					fullWidth
					error={!!errors.alias}
					helperText={errors.alias?.message}
					sx={{ ...styles.textFieldOverrides, mb: 3 }}
					{...register('alias', { required: 'Document name is required' })}
					variant="outlined"
				/>

				<FormControl fullWidth sx={{ mb: 2 }}>
					<InputLabel id="doc-type-label">Document Type</InputLabel>
					<Controller
						name="doc_type"
						control={control}
						render={({ field }) => (
							<Select
								{...field}
								labelId="doc-type-label"
								label="Document Type"
								sx={{ ...styles.selectOverrides, mb: 1 }}
							>
								<MenuItem value={DocType.POLICE_REPORT}>Police Report</MenuItem>
								<MenuItem value={DocType.MEDICAL_RECORD}>Medical Record</MenuItem>
								<MenuItem value={DocType.INVOICE}>Invoice</MenuItem>
								<MenuItem value={DocType.CORRESPONDENCE}>Correspondence</MenuItem>
								<MenuItem value={DocType.SETTLEMENT}>Settlement</MenuItem>
								<MenuItem value={DocType.PHOTO} disabled={selectedFile !== null && !isFileImage}>
									<Box display="flex" justifyContent="space-between" width="100%">
										<span>Photo</span>
										<Typography
											fontSize={12}
											color={selectedFile && !isFileImage ? '#ff0000' : '#d9d9d9'}
											ml={1}
										>
											({IMAGE_EXTENSIONS.join(', ')})
										</Typography>
									</Box>
								</MenuItem>
								<MenuItem value={DocType.ESTIMATE}>Estimate</MenuItem>
								<MenuItem value={DocType.REPAIR_INVOICE}>Repair Invoice</MenuItem>
								<MenuItem value={DocType.PROOF_OF_PAYMENT}>Proof of Payment</MenuItem>
								<MenuItem value={DocType.DEMAND_LETTER}>Demand Letter</MenuItem>
								<MenuItem value={DocType.LEGAL_FILING}>Legal Filing</MenuItem>
								<MenuItem value={DocType.OTHER}>Other</MenuItem>
							</Select>
						)}
					/>
				</FormControl>

				<TextField
					id="title"
					label="Title (optional)"
					placeholder="Brief title"
					fullWidth
					error={!!errors.title}
					helperText={errors.title?.message}
					{...register('title')}
					sx={{ ...styles.textFieldOverrides, mb: 3 }}
					variant="outlined"
				/>

				<TextField
					id="description"
					label="Description (optional)"
					placeholder="Additional details about this document"
					fullWidth
					multiline
					rows={3}
					error={!!errors.description}
					helperText={errors.description?.message}
					{...register('description')}
					sx={styles.textFieldOverrides}
					variant="outlined"
				/>
			</form>
		</BasicDialog>
	);
}

const styles = {
	selectOverrides: {
		width: 300,
		padding: '2px 10px',
		'& .MuiInputBase-root': {
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 13,
			padding: '2px 5px',
		},
	},
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 15,
			padding: '2px 5px',
		},
	},
};
