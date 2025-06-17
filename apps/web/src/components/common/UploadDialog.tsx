'use client';
import { useState } from 'react';
import BasicDialog from './BasicDialog';
import { Collapse, Paper, Typography } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { BACKDROP_COLOR, HOVERED_COLOR } from '@/styles/theme';
import { TransitionGroup } from 'react-transition-group';
import BasicButton from './BasicButton';
import AttachFile from '@mui/icons-material/AttachFile';
import Clear from '@mui/icons-material/Clear';

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
				onClick: () => onConfirmCallback(files),
				disabled: !files.length,
			}}
			width={500}
		>
			<Typography fontStyle="italic">Drop files here or click on the dropzone to browse:</Typography>
			<Paper elevation={0} style={styles.paper}>
				<div
					{...getRootProps()}
					onMouseEnter={() => setDropzoneHovered(true)}
					onMouseLeave={() => setDropzoneHovered(false)}
					style={{
						...styles.dropzone,
						backgroundColor: isDragActive || dropzoneHovered ? HOVERED_COLOR : BACKDROP_COLOR,
					}}
				>
					<input {...getInputProps()} />
					<div style={{ ...styles.row, justifyContent: 'center' }}>
                                               <AttachFile />
                                               <Typography fontSize={15} fontStyle="italic" marginLeft="5px">
                                                       Drop files here
                                               </Typography>
					</div>
				</div>
			</Paper>
			<TransitionGroup>
				{files.map((f, i) => (
					<Collapse key={f.name}>
						<div style={styles.row}>
							<BasicButton
								buttonProps={{
									onClick: () => deleteFile(i),
								}}
								icon={<Clear sx={styles.icon} />}
							/>
							<Typography fontSize={13} fontStyle="italic" marginLeft="5px">
								{f.name}
							</Typography>
						</div>
					</Collapse>
				))}
			</TransitionGroup>
		</BasicDialog>
	);
}

const styles = {
	dropzone: {
		width: 200,
		height: 150,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		transition: 'background-color 300ms ease',
		cursor: 'pointer',
	},
	icon: {
		fontSize: 15,
	},
	paper: {
		outline: '1px solid #E0E0E0',
		width: 200,
		height: 150,
		margin: '10px 0px',
	},
	row: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
		marginBottom: 5,
	},
};
