'use client';

import { IconArrowLeft, IconFileUpload, IconFolderOpen } from '@tabler/icons-react';
import Button from '@/components/ui/Button';
import { useRef, useState } from 'react';
import BasicDialog from '../common/BasicDialog';
import CompactDocumentBrowser from './CompactDocumentBrowser';
import type { DocListItem } from '@/hooks/trpc/useDocTrpc';
import { validateFileType, IMAGE_MIME_TYPES } from '@/config/allowedFileTypes';
import { uploadFileToStorage } from '@/lib/storage/uploadClient';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';

interface DocumentSelectorDialogProps {
	onClose: () => void;
	onSelectDocument?: (doc: DocListItem) => void;
	onSelect?: (doc: DocListItem) => void; // Alias for onSelectDocument
	filterByType?: 'image' | 'all';
	title?: string;
	relationshipData?: {
		question_id?: string;
		answer_id?: string;
		response_doc_id?: string;
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
	const fileInputRef = useRef<HTMLInputElement>(null);
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
					...(relationshipData.question_id !== undefined && {
						answer_id: null,
						response_doc_id: null,
					}),
					...(relationshipData.answer_id !== undefined && {
						question_id: null,
						response_doc_id: null,
					}),
					...(relationshipData.response_doc_id !== undefined && {
						question_id: null,
						answer_id: null,
					}),
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
			// Step 1: Upload directly to storage via signed URL
			const uploadResult = await uploadFileToStorage(selectedFile, {
				allowedExtensions: allowedExtensions ?? undefined,
			});

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
							icon: <IconFileUpload size={20} />,
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
								icon: <IconArrowLeft size={20} />,
								disabled: isBusy,
							},
						]
					: undefined
			}
		>
			{mode === 'choice' && (
				<div>
					<span style={{ fontSize: 13 }}>
						Choose how you want to add {filterByType === 'image' ? 'an image' : 'a document'}:
					</span>

					<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
						<Button
							variant="outlined"
							size="lg"
							startIcon={<IconFolderOpen size={20} />}
							onClick={() => setMode('library')}
							style={{ justifyContent: 'flex-start', padding: 16 }}
						>
							<div style={{ textAlign: 'left', marginLeft: 16 }}>
								<span style={{ fontWeight: 600, fontSize: 14 }}>Choose from library</span>
								<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
									Select an existing {filterByType === 'image' ? 'image' : 'document'}
								</span>
							</div>
						</Button>

						<Button
							variant="outlined"
							size="lg"
							startIcon={<IconFileUpload size={20} />}
							onClick={() => setMode('upload')}
							style={{ justifyContent: 'flex-start', padding: 16 }}
						>
							<div style={{ textAlign: 'left', marginLeft: 16 }}>
								<span style={{ fontWeight: 600, fontSize: 14 }}>Browse this device</span>
								<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
									Upload a new {filterByType === 'image' ? 'image' : 'file'}
								</span>
							</div>
						</Button>
					</div>
				</div>
			)}

			{mode === 'library' && (
				<div>
					<span style={{ fontSize: 13 }}>
						{isLinking
							? 'Linking document...'
							: 'Browse your document library and double-click to select:'}
					</span>
					<CompactDocumentBrowser
						onSelectDocument={handleLibrarySelect}
						filterByType={filterByType}
						height={450}
						userFilteredMode={userFilteredMode}
						userId={userId}
						allowedExtensions={allowedExtensions}
						disabled={isBusy}
					/>
				</div>
			)}

			{mode === 'upload' && (
				<div>
					<span style={{ fontSize: 13 }}>
						{isUploading
							? 'Uploading file...'
							: `Select ${filterByType === 'image' ? 'an image' : 'a file'} from your device to upload:`}
					</span>

					<div style={{ marginBottom: 16 }}>
						{/* Programmatic click: a label can't activate its input when the
						    click lands on an interactive element like a button */}
						<Button
							variant="outlined"
							fullWidth
							disabled={isBusy}
							onClick={() => fileInputRef.current?.click()}
						>
							{selectedFile ? selectedFile.name : 'Choose File'}
						</Button>
						<input
							ref={fileInputRef}
							type="file"
							hidden
							onChange={handleFileChange}
							accept={filterByType === 'image' ? IMAGE_MIME_TYPES.join(',') : undefined}
							disabled={isBusy}
						/>
					</div>

					{selectedFile && (
						<div style={{ backgroundColor: 'var(--bg-secondary)', padding: 16, borderRadius: 4 }}>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
								<strong>Size:</strong> {(selectedFile.size / 1024).toFixed(1)} KB
							</span>
							<span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
								<strong>Type:</strong> {selectedFile.type}
							</span>
						</div>
					)}

					{!selectedFile && (
						<span style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 8 }}>
							{filterByType === 'image'
								? 'Accepted: JPG, PNG, GIF, WebP, BMP, SVG'
								: 'Accepted: PDF, Word, Excel, PowerPoint, images, text files, and archives'}
						</span>
					)}
				</div>
			)}
		</BasicDialog>
	);
}
