'use client';

import { Button, CircularProgress } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { useState } from 'react';
import { downloadCSV, generateCSV, CsvColumn, generateFilenameWithTimestamp } from '@/lib/utils/exportUtils';

export interface ExportButtonProps<T = any> {
	/** Function to fetch data for export (should return all rows, not paginated) */
	onExport: () => Promise<T[]>;
	/** Column configuration for CSV */
	columns: CsvColumn<T>[];
	/** Base filename (timestamp will be appended automatically) */
	filename: string;
	/** Button text (default: "Export CSV") */
	buttonText?: string;
	/** Button variant (default: "outlined") */
	variant?: 'text' | 'outlined' | 'contained';
	/** Button size (default: "medium") */
	size?: 'small' | 'medium' | 'large';
	/** Disable button */
	disabled?: boolean;
}

/**
 * Reusable export button component for generating CSV files
 *
 * Handles:
 * - Loading state during export
 * - Error handling
 * - CSV generation and download
 * - Automatic timestamp in filename
 *
 * @example
 * ```tsx
 * <ExportButton
 *   onExport={async () => {
 *     const result = await trpc.recovery.exportRecoveryEvents.query({ filters });
 *     return result.rows;
 *   }}
 *   columns={[
 *     { header: 'Date', accessor: 'recovery_date' },
 *     { header: 'Amount', accessor: 'recovery_amount' }
 *   ]}
 *   filename="recovery_events"
 * />
 * ```
 */
export default function ExportButton<T = any>({
	onExport,
	columns,
	filename,
	buttonText = 'Export CSV',
	variant = 'outlined',
	size = 'medium',
	disabled = false,
}: ExportButtonProps<T>) {
	const [isExporting, setIsExporting] = useState(false);

	const handleExport = async () => {
		try {
			setIsExporting(true);

			// Fetch data
			const data = await onExport();

			if (!data || data.length === 0) {
				alert('No data to export');
				return;
			}

			// Generate CSV
			const csvContent = generateCSV(data, columns);

			// Download
			const filenameWithTimestamp = generateFilenameWithTimestamp(filename);
			downloadCSV(csvContent, filenameWithTimestamp);
		} catch (error) {
			console.error('Export failed:', error);
			alert('Failed to export data. Please try again.');
		} finally {
			setIsExporting(false);
		}
	};

	return (
		<Button
			variant={variant}
			size={size}
			onClick={handleExport}
			disabled={disabled || isExporting}
			startIcon={isExporting ? <CircularProgress size={16} /> : <FileDownloadIcon />}
		>
			{isExporting ? 'Exporting...' : buttonText}
		</Button>
	);
}
