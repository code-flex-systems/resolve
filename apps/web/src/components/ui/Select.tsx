'use client';

import { forwardRef, type SelectHTMLAttributes } from 'react';
import styles from './Select.module.css';

/* =========================================================================
   SELECT
   ========================================================================= */

export interface SelectOption {
	value: string;
	label: string;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
	options: SelectOption[];
	value?: string;
	onChange?: (value: string) => void;
	label?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	placeholder?: string;
	fullWidth?: boolean;
	disabled?: boolean;
	className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			options,
			value,
			onChange,
			label,
			helperText,
			error,
			errorText,
			placeholder,
			fullWidth,
			disabled,
			className,
			...props
		},
		ref
	) => {
		const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className]
			.filter(Boolean)
			.join(' ');

		const selectClassNames = [
			styles.select,
			error && styles.error,
			disabled && styles.disabled,
		]
			.filter(Boolean)
			.join(' ');

		const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
			onChange?.(e.target.value);
		};

		return (
			<div className={wrapperClassNames}>
				{label && <label className={styles.label}>{label}</label>}
				<div className={styles.selectWrapper}>
					<select
						ref={ref}
						className={selectClassNames}
						value={value}
						onChange={handleChange}
						disabled={disabled}
						{...props}
					>
						{placeholder && (
							<option value="" disabled>
								{placeholder}
							</option>
						)}
						{options.map((option) => (
							<option key={option.value} value={option.value}>
								{option.label}
							</option>
						))}
					</select>
					<span className={styles.chevron} />
				</div>
				{error && errorText ? (
					<span className={styles.errorText}>{errorText}</span>
				) : helperText ? (
					<span className={styles.helperText}>{helperText}</span>
				) : null}
			</div>
		);
	}
);

Select.displayName = 'Select';
export default Select;
