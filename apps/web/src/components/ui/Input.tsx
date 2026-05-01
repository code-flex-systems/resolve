'use client';

import {
	forwardRef,
	type InputHTMLAttributes,
	type ReactNode,
	type TextareaHTMLAttributes,
} from 'react';
import styles from './Input.module.css';

/* =========================================================================
   INPUT
   ========================================================================= */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
	label?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	fullWidth?: boolean;
	/** Input height: sm=32px (default), md=36px, lg=42px */
	inputSize?: 'sm' | 'md' | 'lg';
	startAdornment?: ReactNode;
	endAdornment?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
	(
		{
			label,
			helperText,
			error,
			errorText,
			fullWidth,
			inputSize = 'sm',
			startAdornment,
			endAdornment,
			className,
			disabled,
			...props
		},
		ref
	) => {
		const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className]
			.filter(Boolean)
			.join(' ');

		const inputWrapperClassNames = [
			styles.inputWrapper,
			styles[`size-${inputSize}`],
			error && styles.error,
			disabled && styles.disabled,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<div className={wrapperClassNames}>
				{label && <label className={styles.label}>{label}</label>}
				<div className={inputWrapperClassNames}>
					{startAdornment && <span className={styles.adornment}>{startAdornment}</span>}
					<input ref={ref} className={styles.input} disabled={disabled} {...props} />
					{endAdornment && <span className={styles.adornment}>{endAdornment}</span>}
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

Input.displayName = 'Input';
export default Input;

/* =========================================================================
   TEXTAREA
   ========================================================================= */

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
	label?: string;
	helperText?: string;
	error?: boolean;
	errorText?: string;
	fullWidth?: boolean;
	/** Minimum visible rows (sets min-height) */
	minRows?: number;
	startAdornment?: ReactNode;
	endAdornment?: ReactNode;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	(
		{
			label,
			helperText,
			error,
			errorText,
			fullWidth,
			minRows,
			startAdornment,
			endAdornment,
			className,
			disabled,
			style,
			...props
		},
		ref
	) => {
		const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className]
			.filter(Boolean)
			.join(' ');

		const hasAdornments = !!startAdornment || !!endAdornment;

		// Calculate min-height from minRows (approximate line height of 20px + padding)
		const minHeight = minRows ? minRows * 20 + 16 : undefined;

		if (hasAdornments) {
			// Adornment layout: use a wrapper div like Input does
			const textareaWrapperClassNames = [
				styles.textareaWrapper,
				error && styles.error,
				disabled && styles.disabled,
			]
				.filter(Boolean)
				.join(' ');

			return (
				<div className={wrapperClassNames}>
					{label && <label className={styles.label}>{label}</label>}
					<div className={textareaWrapperClassNames} style={{ minHeight, ...style }}>
						{startAdornment && <span className={styles.textareaAdornment}>{startAdornment}</span>}
						<textarea ref={ref} className={styles.textareaInner} disabled={disabled} {...props} />
						{endAdornment && <span className={styles.textareaAdornment}>{endAdornment}</span>}
					</div>
					{error && errorText ? (
						<span className={styles.errorText}>{errorText}</span>
					) : helperText ? (
						<span className={styles.helperText}>{helperText}</span>
					) : null}
				</div>
			);
		}

		const textareaClassNames = [styles.textarea, error && styles.error, disabled && styles.disabled]
			.filter(Boolean)
			.join(' ');

		return (
			<div className={wrapperClassNames}>
				{label && <label className={styles.label}>{label}</label>}
				<textarea
					ref={ref}
					className={textareaClassNames}
					disabled={disabled}
					style={{ minHeight, ...style }}
					{...props}
				/>
				{error && errorText ? (
					<span className={styles.errorText}>{errorText}</span>
				) : helperText ? (
					<span className={styles.helperText}>{helperText}</span>
				) : null}
			</div>
		);
	}
);

Textarea.displayName = 'Textarea';
