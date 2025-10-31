'use client';

import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CompactDocumentBrowser from './CompactDocumentBrowser';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { validateFileType, IMAGE_MIME_TYPES } from '@/config/allowedFileTypes';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';

interface DocumentSelectorDialogProps {
	onClose: () => void;
	onSelectDocument?: (doc: DocListItem) => void;
	onSelect?: (doc: DocListItem) => void; // Alias for onSelectDocument
	filterByType?: 'image' | 'all';
	title?: string;
	relationshipData?: {
		question_id?: number;
		answer_id?: number;
		response_doc_id?: number;
	};
	userFilteredMode?: boolean; // If true, filter library to show only user's documents
	userId?: string; // User ID for filtering
	allowedExtensions?: string[] | null; // Array of allowed file extensions (e.g., ['.pdf', '.docx'])
	autoOrganize?: boolean; // If true, organize uploads into Users/[userId]/ folder
}

export default function DocumentSelectorDialog({
	onClose,
	onSelectDocument,
	onSelect,
	filterByType = 'all',
	title = 'Add Document',
	relationshipData,
	userFilteredMode = false,
	userId,
	allowedExtensions = null,
	autoOrganize = false,
}: DocumentSelectorDialogProps) {
	// Use onSelect if provided, otherwise fall back to onSelectDocument
	const handleSelect = onSelect || onSelectDocument;
	if (!handleSelect) {
		throw new Error('Either onSelect or onSelectDocument must be provided');
	}
	const [mode, setMode] = useState<'choice' | 'library' | 'upload'>('choice');
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [isUploading, setIsUploading] = useState(false);
	const [isLinking, setIsLinking] = useState(false);
	const { mutateAsync: createDoc } = useDocTrpc().createDoc;
	const { mutateAsync: updateDoc } = useDocTrpc().updateDoc;

	const isBusy = isUploading || isLinking;

	const handleLibrarySelect = async (doc: DocListItem) => {
		if (isBusy) return; // Prevent multiple calls

		// Update the document to link it to the question, answer, or response
		if (relationshipData) {
			setIsLinking(true);
			try {
				// Clear any existing relationships when setting a new one
				const params = {
					...relationshipData,
					// Clear conflicting relationships
					...(relationshipData.question_id !== undefined && { answer_id: null, response_doc_id: null }),
					...(relationshipData.answer_id !== undefined && { question_id: null, response_doc_id: null }),
					...(relationshipData.response_doc_id !== undefined && { question_id: null, answer_id: null }),
				};

				const updatedDoc = await updateDoc({
					docId: doc.id,
					params,
				});
				handleSelect(updatedDoc);
			} catch (e) {
				console.error('Error updating doc:', e);
				const errorMessage = e instanceof Error ? e.message : 'Unknown error';
				alert(`Failed to link document: ${errorMessage}`);
				return;
			} finally {
				setIsLinking(false);
			}
		} else {
			handleSelect(doc);
		}
		onClose();
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			// Client-side validation
			const validation = validateFileType(file.name, file.type);
			if (!validation.valid) {
				alert(validation.reason || 'Invalid file type');
				event.target.value = '';
				return;
			}

			// If restricted to images, validate it's an image
			if (filterByType === 'image' && !IMAGE_MIME_TYPES.includes(file.type)) {
				alert('Please select an image file (JPG, PNG, GIF, WebP, BMP, or SVG)');
				event.target.value = '';
				return;
			}

			// If allowedExtensions is specified, validate against it
			if (allowedExtensions && allowedExtensions.length > 0) {
				const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
				if (!allowedExtensions.includes(fileExtension)) {
					alert(`Only the following file types are allowed: ${allowedExtensions.join(', ')}`);
					event.target.value = '';
					return;
				}
			}

			setSelectedFile(file);
		}
	};

	const handleUpload = async () => {
		if (!selectedFile) return;

		setIsUploading(true);
		try {
			// Step 1: Upload to Azure
			const formData = new FormData();
			formData.append('file', selectedFile);

			// Build upload URL with optional allowedExtensions query parameter
			let uploadUrl = '/api/upload';
			if (allowedExtensions && allowedExtensions.length > 0) {
				uploadUrl += `?allowedExtensions=${encodeURIComponent(allowedExtensions.join(','))}`;
			}

			const uploadResponse = await fetch(uploadUrl, {
				method: 'POST',
				body: formData,
			});

			if (!uploadResponse.ok) {
				const error = await uploadResponse.json();
				throw new Error(error.error || 'Upload failed');
			}

			const uploadResult = await uploadResponse.json();

			// Step 2: Create document record with relationship data
			// Sanitize filename to remove problematic Unicode characters (like U+202F narrow no-break space from macOS screenshots)
			const sanitizedFilename = selectedFile.name.replace(/[^\x20-\x7E]/g, '_');

			const createdDoc = await createDoc({
				params: {
					filename: sanitizedFilename,
					alias: sanitizedFilename,
					title: sanitizedFilename,
					file_size: selectedFile.size,
					mime_type: selectedFile.type || 'application/octet-stream',
					...relationshipData, // Include question_id, answer_id, or response_doc_id
				},
				storageKey: uploadResult.storageKey,
				autoOrganize,
			});

			handleSelect(createdDoc);
			onClose();
		} catch (e) {
			console.error(e);
			alert(`Failed to upload: ${e instanceof Error ? e.message : 'Unknown error'}`);
		} finally {
			setIsUploading(false);
		}
	};

	return (
		<BasicDialog
			title={title}
			onClose={onClose}
			closeDisabled={isBusy}
			width={mode === 'library' ? 800 : 500}
			primaryAction={
				mode === 'upload' && selectedFile
					? {
							label: isUploading ? 'Uploading...' : 'Upload',
							onClick: handleUpload,
							disabled: isBusy,
							icon: <UploadFileIcon />,
					  }
					: undefined
			}
			secondaryActions={
				mode !== 'choice'
					? [
							{
								label: 'Back',
								onClick: () => {
									setMode('choice');
									setSelectedFile(null);
								},
								icon: <ArrowBackIcon />,
								disabled: isBusy,
							},
					  ]
					: undefined
			}
		>
			{mode === 'choice' && (
				<Box>
					<Typography fontSize={13} mb={3}>
						Choose how you want to add {filterByType === 'image' ? 'an image' : 'a document'}:
					</Typography>

					<Box display="flex" flexDirection="column" gap={2}>
						<Button
							variant="outlined"
							size="large"
							startIcon={<FolderOpenIcon />}
							onClick={() => setMode('library')}
							sx={{ justifyContent: 'flex-start', p: 2 }}
						>
							<Box textAlign="left" ml={2}>
								<Typography fontWeight={600} fontSize={14}>
									Choose from library
								</Typography>
								<Typography fontSize={12} color="text.secondary">
									Select an existing {filterByType === 'image' ? 'image' : 'document'}
								</Typography>
							</Box>
						</Button>

						<Button
							variant="outlined"
							size="large"
							startIcon={<UploadFileIcon />}
							onClick={() => setMode('upload')}
							sx={{ justifyContent: 'flex-start', p: 2 }}
						>
							<Box textAlign="left" ml={2}>
								<Typography fontWeight={600} fontSize={14}>
									Browse this device
								</Typography>
								<Typography fontSize={12} color="text.secondary">
									Upload a new {filterByType === 'image' ? 'image' : 'file'}
								</Typography>
							</Box>
						</Button>
					</Box>
				</Box>
			)}

			{mode === 'library' && (
				<Box>
					<Typography fontSize={13} mb={2}>
						{isLinking ? 'Linking document...' : 'Browse your document library and double-click to select:'}
					</Typography>
					<CompactDocumentBrowser
						onSelectDocument={handleLibrarySelect}
						filterByType={filterByType}
						height={450}
						userFilteredMode={userFilteredMode}
						userId={userId}
						allowedExtensions={allowedExtensions}
						disabled={isBusy}
					/>
				</Box>
			)}

			{mode === 'upload' && (
				<Box>
					<Typography fontSize={13} mb={2}>
						{isUploading
							? 'Uploading file...'
							: `Select ${filterByType === 'image' ? 'an image' : 'a file'} from your device to upload:`}
					</Typography>

					<Button variant="outlined" component="label" fullWidth sx={{ mb: 2 }} disabled={isBusy}>
						{selectedFile ? selectedFile.name : 'Choose File'}
						<input
							type="file"
							hidden
							onChange={handleFileChange}
							accept={filterByType === 'image' ? IMAGE_MIME_TYPES.join(',') : undefined}
							disabled={isBusy}
						/>
					</Button>

					{selectedFile && (
						<Box bgcolor="#f5f5f5" p={2} borderRadius={1}>
							<Typography fontSize={12} color="text.secondary">
								<strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB
							</Typography>
							<Typography fontSize={12} color="text.secondary">
								<strong>Type:</strong> {selectedFile.type}
							</Typography>
						</Box>
					)}

					{!selectedFile && (
						<Typography fontSize={11} color="text.secondary" mt={1}>
							{filterByType === 'image'
								? 'Accepted: JPG, PNG, GIF, WebP, BMP, SVG'
								: 'Accepted: PDF, Word, Excel, PowerPoint, images, text files, and archives'}
						</Typography>
					)}
				</Box>
			)}
		</BasicDialog>
	);
}
