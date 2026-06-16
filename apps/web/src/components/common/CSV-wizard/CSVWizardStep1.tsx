'use client';

import React, { useState, useCallback } from 'react';
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

	const { getRootProps, getInputProps, isDragActive } = useDropzone({
		onDrop,
		accept: { 'text/csv': ['.csv'] },
	});

	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				gap: 8,
				alignItems: 'flex-start',
				height: 350,
			}}
		>
			<p style={{ fontSize: 15, fontStyle: 'italic' }}>
				The following columns are expected in your file:
			</p>
			<p style={{ fontSize: 14, fontStyle: 'italic', fontWeight: 'bold', margin: 0 }}>
				{fields
					.sort((a, b) => a.label.localeCompare(b.label))
					.map((f) => f.label)
					.join(', ')}
			</p>
			<div
				{...getRootProps({ style: { height: 300 } })}
				style={{
					height: 300,
					padding: 32,
					textAlign: 'center',
					width: '100%',
					backgroundColor: 'var(--bg-secondary)',
					cursor: 'pointer',
					borderRadius: 'var(--radius-lg)',
					border: '1px solid var(--border)',
				}}
			>
				<input {...getInputProps({ style: { height: 100, visibility: 'hidden' } })} />
				<p>
					{isDragActive
						? 'Drop the CSV file here...'
						: 'Drag and drop a CSV file here, or click to select'}
				</p>
				{filename && <p style={{ fontSize: 14, marginTop: 8 }}>Selected: {filename}</p>}
			</div>

			{error && <p style={{ color: 'var(--color-error)' }}>{error}</p>}
		</div>
	);
}
