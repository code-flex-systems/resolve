'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';
import styles from './Switch.module.css';

export interface SwitchProps
	extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size' | 'checked'> {
	checked: boolean;
	onChange: (checked: boolean) => void;
	label?: string;
	disabled?: boolean;
	size?: 'sm' | 'md';
	className?: string;
}

const Switch = forwardRef<HTMLInputElement, SwitchProps>(
	({ checked, onChange, label, disabled, size = 'md', className, ...props }, ref) => {
		const classNames = [styles.wrapper, disabled && styles.disabled, className]
			.filter(Boolean)
			.join(' ');

		return (
			<label className={classNames}>
				<input
					ref={ref}
					type="checkbox"
					className={styles.input}
					checked={checked}
					disabled={disabled}
					onChange={(e) => onChange(e.target.checked)}
					{...props}
				/>
				<span className={[styles.track, styles[size], checked && styles.checked].filter(Boolean).join(' ')}>
					<span className={styles.thumb} />
				</span>
				{label && <span className={styles.label}>{label}</span>}
			</label>
		);
	}
);

Switch.displayName = 'Switch';
export default Switch;
