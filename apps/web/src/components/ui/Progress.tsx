'use client';

import { forwardRef } from 'react';
import styles from './Progress.module.css';

/* =========================================================================
   SPINNER
   ========================================================================= */

export interface SpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	color?: 'primary' | 'neutral';
	className?: string;
}

export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(
	({ size = 'md', color = 'primary', className }, ref) => {
		const classNames = [
			styles.spinner,
			styles[`spinner-${size}`],
			styles[`spinner-${color}`],
			className,
		]
			.filter(Boolean)
			.join(' ');

		return <span ref={ref} className={classNames} />;
	}
);

Spinner.displayName = 'Spinner';

/* =========================================================================
   PROGRESS BAR
   ========================================================================= */

export interface ProgressBarProps {
	value?: number; // 0-100, undefined = indeterminate
	color?: 'primary' | 'success' | 'error' | 'warning';
	className?: string;
}

export const ProgressBar = forwardRef<HTMLDivElement, ProgressBarProps>(
	({ value, color = 'primary', className }, ref) => {
		const isIndeterminate = value === undefined;

		const outerClassNames = [styles.track, className].filter(Boolean).join(' ');

		const innerClassNames = [
			styles.bar,
			styles[`bar-${color}`],
			isIndeterminate && styles.indeterminate,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<div ref={ref} className={outerClassNames}>
				<div
					className={innerClassNames}
					style={!isIndeterminate ? { width: `${Math.min(100, Math.max(0, value))}%` } : undefined}
				/>
			</div>
		);
	}
);

ProgressBar.displayName = 'ProgressBar';
