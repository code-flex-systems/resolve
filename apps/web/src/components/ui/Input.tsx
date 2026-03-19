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
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
	({ label, helperText, error, errorText, fullWidth, className, disabled, ...props }, ref) => {
		const wrapperClassNames = [styles.wrapper, fullWidth && styles.fullWidth, className]
			.filter(Boolean)
			.join(' ');

		const textareaClassNames = [
			styles.textarea,
			error && styles.error,
			disabled && styles.disabled,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<div className={wrapperClassNames}>
				{label && <label className={styles.label}>{label}</label>}
				<textarea ref={ref} className={textareaClassNames} disabled={disabled} {...props} />
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
