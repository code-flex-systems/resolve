'use client';
import { useState } from 'react';
import BasicDialog from './BasicDialog';
import { Box, Collapse, Paper, Typography } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { TransitionGroup } from 'react-transition-group';
import BasicButton from './BasicButton';
import AttachFile from '@mui/icons-material/AttachFile';
import Clear from '@mui/icons-material/Clear';
import { BG_TERTIARY, HOVERED_COLOR } from '@/styles/theme';

export default function UploadDialog(props: {
	onClose: () => void;
	onConfirmCallback?: (files: File[]) => void;
	multi?: boolean;
}) {
	const { onClose, onConfirmCallback } = props;
	const [files, setFiles] = useState<File[]>([]);
	const [dropzoneHovered, setDropzoneHovered] = useState(false);
	const onDrop = (acceptedFiles: File[]) => setFiles(acceptedFiles);
	const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

	const deleteFile = (index: number) => {
		const newFiles: File[] = [...files];
		newFiles.splice(index, 1);
		setFiles(newFiles);
	};

	return (
		<BasicDialog
			title="Upload Files"
			onClose={onClose}
			primaryAction={{
				label: 'Upload',
				onClick: () => onConfirmCallback?.(files),
				disabled: !files.length,
			}}
			width={500}
		>
			<Typography fontStyle="italic" fontSize={13}>
				Drop files here or click on the dropzone to browse:
			</Typography>
			<Paper
				elevation={0}
				sx={{
					width: 200,
					height: 150,
					my: 1,
				}}
			>
				<Box
					{...getRootProps()}
					onMouseEnter={() => setDropzoneHovered(true)}
					onMouseLeave={() => setDropzoneHovered(false)}
					sx={{
						width: 200,
						height: 150,
						display: 'flex',
						justifyContent: 'center',
						alignItems: 'center',
						transition: 'background-color 300ms ease',
						cursor: 'pointer',
						bgcolor: isDragActive || dropzoneHovered ? HOVERED_COLOR : BG_TERTIARY,
						borderRadius: 3,
					}}
				>
					<input {...getInputProps()} />
					<Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
						<AttachFile />
						<Typography fontSize={13} fontStyle="italic" ml={0.5}>
							Drop files here
						</Typography>
					</Box>
				</Box>
			</Paper>
			<TransitionGroup>
				{files.map((f, i) => (
					<Collapse key={f.name}>
						<Box
							sx={{
								width: '100%',
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								mb: 0.5,
							}}
						>
							<BasicButton
								buttonProps={{
									onClick: () => deleteFile(i),
								}}
								icon={<Clear sx={{ fontSize: 15 }} />}
							/>
							<Typography fontSize={13} fontStyle="italic" ml={0.5}>
								{f.name}
							</Typography>
						</Box>
					</Collapse>
				))}
			</TransitionGroup>
		</BasicDialog>
	);
}
