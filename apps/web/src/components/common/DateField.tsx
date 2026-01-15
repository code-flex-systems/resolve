'use client';

import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import dayjs, { Dayjs } from 'dayjs';
import { SxProps, Theme } from '@mui/material';

interface DateFieldProps {
	/** ISO date string like "2024-01-15" */
	value: string | null | undefined;
	/** Called with ISO date string or null */
	onChange: (value: string | null) => void;
	label?: string;
	required?: boolean;
	error?: boolean;
	helperText?: React.ReactNode;
	disabled?: boolean;
	fullWidth?: boolean;
	sx?: SxProps<Theme>;
	minDate?: Dayjs;
	maxDate?: Dayjs;
	disableFuture?: boolean;
	disablePast?: boolean;
}

export default function DateField({
	value,
	onChange,
	label,
	required,
	error,
	helperText,
	disabled,
	fullWidth,
	sx,
	minDate,
	maxDate,
	disableFuture,
	disablePast,
}: DateFieldProps) {
	// Convert string to Dayjs for internal use
	const dayjsValue = value ? dayjs(value) : null;

	// Handle change - convert Dayjs back to ISO string
	const handleChange = (newValue: Dayjs | null) => {
		if (newValue && newValue.isValid()) {
			onChange(newValue.format('YYYY-MM-DD'));
		} else {
			onChange(null);
		}
	};

	return (
		<DatePicker
			label={label}
			value={dayjsValue}
			onChange={handleChange}
			disabled={disabled}
			minDate={minDate}
			maxDate={maxDate}
			disableFuture={disableFuture}
			disablePast={disablePast}
			slotProps={{
				textField: {
					required,
					error,
					helperText,
					fullWidth,
					sx,
					InputLabelProps: {
						shrink: true,
					},
					InputProps: {
						notched: true,
					},
				},
			}}
		/>
	);
}
