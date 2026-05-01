'use client';

import { CSSProperties, useEffect, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import Input from '@/components/ui/Input';
import { IconCalendar } from '@tabler/icons-react';
import { DayPicker, type DateAfter, type DateBefore } from 'react-day-picker';
import 'react-day-picker/style.css';

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
	/** Style object applied to the wrapper div (replaces MUI sx) */
	sx?: CSSProperties;
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
	const [open, setOpen] = useState(false);
	const wrapperRef = useRef<HTMLDivElement>(null);

	const dayjsValue = value ? dayjs(value) : null;
	const displayValue = dayjsValue?.isValid() ? dayjsValue.format('MM/DD/YYYY') : '';

	// Close dropdown on outside click
	useEffect(() => {
		if (!open) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
				setOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => document.removeEventListener('mousedown', handleClickOutside);
	}, [open]);

	const disabledMatcher: (DateBefore | DateAfter)[] = [];
	if (disableFuture) disabledMatcher.push({ after: new Date() });
	if (disablePast) disabledMatcher.push({ before: new Date() });
	if (minDate) disabledMatcher.push({ before: minDate.toDate() });
	if (maxDate) disabledMatcher.push({ after: maxDate.toDate() });

	return (
		<div
			ref={wrapperRef}
			style={{ position: 'relative', width: fullWidth ? '100%' : undefined, ...sx }}
		>
			<Input
				label={label}
				value={displayValue}
				readOnly
				onClick={() => !disabled && setOpen((prev) => !prev)}
				error={error}
				errorText={typeof helperText === 'string' ? helperText : undefined}
				disabled={disabled}
				fullWidth={fullWidth}
				required={required}
				endAdornment={
					<IconCalendar
						size={16}
						style={{ color: 'var(--text-secondary)', cursor: disabled ? 'default' : 'pointer' }}
					/>
				}
				style={{ cursor: disabled ? 'default' : 'pointer' }}
			/>
			{open && (
				<div
					style={{
						position: 'absolute',
						top: '100%',
						left: 0,
						zIndex: 1300,
						background: 'var(--bg-white)',
						border: '1px solid var(--border)',
						borderRadius: 'var(--radius-lg)',
						boxShadow: 'var(--shadow-lg)',
						marginTop: 4,
					}}
				>
					<DayPicker
						mode="single"
						selected={dayjsValue?.toDate() ?? undefined}
						onSelect={(date) => {
							if (date) {
								onChange(dayjs(date).format('YYYY-MM-DD'));
							} else {
								onChange(null);
							}
							setOpen(false);
						}}
						disabled={disabledMatcher.length > 0 ? disabledMatcher : undefined}
						defaultMonth={dayjsValue?.toDate() ?? undefined}
					/>
				</div>
			)}
		</div>
	);
}
