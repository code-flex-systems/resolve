'use client';

import { forwardRef, useEffect, useRef, type InputHTMLAttributes } from 'react';
import styles from './Checkbox.module.css';

export interface CheckboxProps extends Omit<
	InputHTMLAttributes<HTMLInputElement>,
	'onChange' | 'checked'
> {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	indeterminate?: boolean;
	className?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
	({ checked, onChange, label, disabled, indeterminate, className, ...props }, ref) => {
		const internalRef = useRef<HTMLInputElement>(null);

		// Merge refs
		const setRef = (el: HTMLInputElement | null) => {
			(internalRef as React.MutableRefObject<HTMLInputElement | null>).current = el;
			if (typeof ref === 'function') ref(el);
			else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = el;
		};

		useEffect(() => {
			if (internalRef.current) {
				internalRef.current.indeterminate = !!indeterminate;
			}
		}, [indeterminate]);

		const classNames = [styles.wrapper, disabled && styles.disabled, className]
			.filter(Boolean)
			.join(' ');

		const boxClasses = [
			styles.box,
			checked && styles.checked,
			indeterminate && !checked && styles.indeterminate,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<label className={classNames}>
				<input
					ref={setRef}
					type="checkbox"
					className={styles.input}
					checked={checked}
					disabled={disabled}
					onChange={(e) => onChange(e.target.checked)}
					{...props}
				/>
				<span className={boxClasses}>
					{checked && (
						<svg className={styles.icon} viewBox="0 0 12 12" fill="none">
							<path
								d="M2.5 6L5 8.5L9.5 3.5"
								stroke="white"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					)}
					{indeterminate && !checked && (
						<svg className={styles.icon} viewBox="0 0 12 12" fill="none">
							<path d="M3 6H9" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
						</svg>
					)}
				</span>
				{label && <span className={styles.label}>{label}</span>}
			</label>
		);
	}
);

Checkbox.displayName = 'Checkbox';
export default Checkbox;
