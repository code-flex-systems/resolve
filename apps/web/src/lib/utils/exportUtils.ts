import dayjs from 'dayjs';

/**
 * Column configuration for CSV export
 */
export interface CsvColumn<T = any> {
	/** Column header in CSV */
	header: string;
	/** Key to extract from data object, or custom accessor function */
	accessor: keyof T | ((row: T) => any);
	/** Optional formatter for cell values */
	formatter?: (value: any) => string;
}

/**
 * Escapes a CSV cell value by:
 * - Wrapping in quotes if it contains comma, newline, or quote
 * - Doubling any quotes inside the value
 */
function escapeCsvCell(value: any): string {
	if (value === null || value === undefined) {
		return '';
	}

	const stringValue = String(value);

	// Check if we need to escape (contains comma, quote, or newline)
	if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
		// Double any quotes and wrap in quotes
		return `"${stringValue.replace(/"/g, '""')}"`;
	}

	return stringValue;
}

/**
 * Default formatter for common data types
 */
function defaultFormatter(value: any): string {
	if (value === null || value === undefined) {
		return '';
	}

	// Handle dates
	if (value instanceof Date) {
		return dayjs(value).format('YYYY-MM-DD HH:mm:ss');
	}

	// Handle boolean
	if (typeof value === 'boolean') {
		return value ? 'Yes' : 'No';
	}

	// Handle numbers
	if (typeof value === 'number') {
		return value.toString();
	}

	// Default to string
	return String(value);
}

/**
 * Generates CSV content from data array and column configuration
 *
 * @param data - Array of data objects
 * @param columns - Column configuration
 * @returns CSV string ready for download
 *
 * @example
 * ```typescript
 * const csv = generateCSV(events, [
 *   { header: 'Date', accessor: 'recovery_date', formatter: (v) => dayjs(v).format('MM/DD/YYYY') },
 *   { header: 'Amount', accessor: 'recovery_amount', formatter: (v) => `$${v.toFixed(2)}` },
 *   { header: 'Source', accessor: 'recovery_source' }
 * ]);
 * ```
 */
export function generateCSV<T = any>(data: T[], columns: CsvColumn<T>[]): string {
	if (!data || data.length === 0) {
		return '';
	}

	// Generate header row
	const headers = columns.map((col) => escapeCsvCell(col.header)).join(',');

	// Generate data rows
	const rows = data.map((row) => {
		return columns
			.map((col) => {
				// Extract value using accessor
				const value =
					typeof col.accessor === 'function' ? col.accessor(row) : (row[col.accessor] as any);

				// Apply formatter if provided, otherwise use default
				const formatted = col.formatter ? col.formatter(value) : defaultFormatter(value);

				return escapeCsvCell(formatted);
			})
			.join(',');
	});

	// Combine header and rows
	return [headers, ...rows].join('\n');
}

/**
 * Triggers a browser download of CSV content
 *
 * @param csvContent - CSV string to download
 * @param filename - Name of the file (without .csv extension)
 *
 * @example
 * ```typescript
 * downloadCSV(csvContent, 'recovery_events_2025_Q1');
 * ```
 */
export function downloadCSV(csvContent: string, filename: string): void {
	// Add .csv extension if not present
	const fullFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;

	// Create blob with UTF-8 BOM for Excel compatibility
	const BOM = '\uFEFF';
	const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });

	// Create download link and trigger
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);

	link.setAttribute('href', url);
	link.setAttribute('download', fullFilename);
	link.style.visibility = 'hidden';

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Clean up
	URL.revokeObjectURL(url);
}

/**
 * Helper to generate filename with timestamp
 *
 * @param baseName - Base name for the file
 * @returns Filename with timestamp (e.g., "recovery_events_2025-10-29_143022")
 */
export function generateFilenameWithTimestamp(baseName: string): string {
	const timestamp = dayjs().format('YYYY-MM-DD_HHmmss');
	return `${baseName}_${timestamp}`;
}
