'use client';

import { forwardRef, type SelectHTMLAttributes, type ReactNode, type ChangeEvent } from 'react';
import styles from './Select.module.css';

/* =========================================================================
   SELECT
   ========================================================================= */

export interface SelectOption {
	value: string;
	label: string;
	disabled?: boolean;
}

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'size'> {
	/** Options array — simple rendering */
	options?: SelectOption[];
	/** Children-based options — for custom <option> or <optgroup> rendering */
	children?: ReactNode;
	value?: string;
	/** Simplified onChange: receives the string value directly */
	onChange?: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
	/** Native onChange: receives the full event (for react-hook-form register()) */
	onChangeNative?: (event: ChangeEvent<HTMLSelectElement>) => void;
	label?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	placeholder?: string;
	fullWidth?: boolean;
	disabled?: boolean;
	/** Select height: sm=32px (default), md=36px */
	selectSize?: 'sm' | 'md';
	className?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
	(
		{
			options,
			children,
			value,
			onChange,
			onChangeNative,
			label,
			helperText,
			error,
			errorText,
			placeholder,
			fullWidth,
			disabled,
			selectSize = 'sm',
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
			styles[`size-${selectSize}`],
			error && styles.error,
			disabled && styles.disabled,
		]
			.filter(Boolean)
			.join(' ');

		const handleChange = (e: ChangeEvent<HTMLSelectElement>) => {
			onChangeNative?.(e);
			onChange?.(e.target.value, e);
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
						{options
							? options.map((option) => (
									<option key={option.value} value={option.value} disabled={option.disabled}>
										{option.label}
									</option>
								))
							: children}
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
