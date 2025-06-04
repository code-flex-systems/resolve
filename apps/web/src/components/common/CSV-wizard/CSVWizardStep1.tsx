// CSVStep1.tsx
import React, { useState, useCallback } from 'react';
import { Typography, Stack, Paper } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import Papa from 'papaparse';

type MappingField = {
	key: string;
	label: string;
	required?: boolean;
};

type Props = {
	fields: MappingField[];
	onParsed: (headers: string[], file: File) => void;
};

export function CSVStep1({ fields, onParsed }: Props) {
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
		<Stack spacing={1} alignItems="left" sx={{ height: 350 }}>
			<Typography fontSize={15} fontStyle="italic">
				The following columns are expected in your file:
			</Typography>
			<Typography fontSize={14} fontStyle="italic" fontWeight="bold" margin={0}>
				{fields
					.sort((a, b) => a.label.localeCompare(b.label))
					.map((f) => f.label)
					.join(', ')}
			</Typography>
			<Paper {...getRootProps({ style: { height: 300 } })} elevation={0} sx={styles.paper}>
				<input {...getInputProps({ style: { height: 100, visibility: 'hidden' } })} />
				<Typography>
					{isDragActive ? 'Drop the CSV file here...' : 'Drag and drop a CSV file here, or click to select'}
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
