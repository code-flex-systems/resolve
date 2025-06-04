// CSVStep1.tsx
import React, { useState, useCallback } from 'react';
import { Typography, Stack, Paper } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

type Props = {
	onParsed: (headers: string[], file: File) => void;
};

export function CSVStep1({ onParsed }: Props) {
	const [error, setError] = useState<string | null>(null);
	const [filename, setFilename] = useState<string | null>(null);

	const onDrop = useCallback(
		(acceptedFiles: File[]) => {
			const file = acceptedFiles[0];
			if (!file.name.endsWith('.csv')) {
				setError('Please upload a valid CSV file.');
				return;
			}

			Papa.parse(file, {
				preview: 1,
				header: true,
				skipEmptyLines: true,
				complete: (results) => {
					if (!results.meta.fields || results.meta.fields.length === 0) {
						setError('Could not parse column headers from the file.');
					} else {
						setError(null);
						setFilename(file.name);
						onParsed(results.meta.fields, file);
					}
				},
				error: (err) => {
					setError('Failed to parse CSV: ' + err.message);
				},
			});
		},
		[onParsed]
	);

	const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'text/csv': ['.csv'] } });

	return (
		<Stack spacing={2} alignItems="center" sx={{ height: 350 }}>
			<Paper {...getRootProps({ style: { height: 350 } })} elevation={0} sx={styles.paper}>
				<input {...getInputProps({ style: { height: 100 } })} />
				<Typography>
					{isDragActive ? 'Drop the CSV file here...' : "Drag 'n' drop a CSV file here, or click to select"}
				</Typography>
				{filename && (
					<Typography variant="body2" mt={1}>
						Selected: {filename}
					</Typography>
				)}
			</Paper>

			{error && <Typography color="error">{error}</Typography>}
		</Stack>
	);
}

const styles = {
	paper: {
		p: 4,
		textAlign: 'center',
		width: '100%',
		backgroundColor: '#f7f7f7',
		cursor: 'pointer',
	},
};
