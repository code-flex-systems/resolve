'use client';

import Button from '@/components/ui/Button';
import { IconFileDownload } from '@tabler/icons-react';
import { useState } from 'react';
import {
	downloadCSV,
	generateCSV,
	CsvColumn,
	generateFilenameWithTimestamp,
} from '@/lib/utils/exportUtils';

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
	variant?: 'outlined' | 'contained' | 'text';
	/** Button size (default: "md") */
	size?: 'sm' | 'md' | 'lg';
	/** Disable button */
	disabled?: boolean;
}

/**
 * Reusable export button component for generating CSV files
 */
export default function ExportButton<T = any>({
	onExport,
	columns,
	filename,
	buttonText = 'Export CSV',
	variant = 'outlined',
	size = 'md',
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
			loading={isExporting}
			startIcon={<IconFileDownload size={16} />}
		>
			{isExporting ? 'Exporting...' : buttonText}
		</Button>
	);
}
