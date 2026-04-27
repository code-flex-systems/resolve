'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Chip.module.css';

export interface ChipProps extends HTMLAttributes<HTMLSpanElement> {
	variant?: 'filled' | 'outlined';
	color?: 'success' | 'error' | 'warning' | 'info' | 'neutral';
	size?: 'sm' | 'md';
	children: ReactNode;
	className?: string;
}

const Chip = forwardRef<HTMLSpanElement, ChipProps>(
	({ variant = 'filled', color = 'neutral', size = 'md', className, children, ...props }, ref) => {
		const classNames = [styles.chip, styles[variant], styles[size], styles[`color-${color}`], className]
			.filter(Boolean)
			.join(' ');

		const interactive = !!props.onClick;

		return (
			<span
				ref={ref}
				className={classNames}
				{...(interactive ? { 'data-interactive': '', tabIndex: 0, role: 'button' } : {})}
				{...props}
			>
				{children}
			</span>
		);
	}
);

Chip.displayName = 'Chip';
export default Chip;
