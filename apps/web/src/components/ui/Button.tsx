'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: 'contained' | 'outlined' | 'text' | 'solid' | 'icon' | 'ghost' | 'compact';
	size?: 'sm' | 'md' | 'lg';
	color?: 'primary' | 'success' | 'error' | 'warning' | 'neutral';
	/** Whether the icon button should use a filled style vs outline (default) */
	iconFilled?: boolean;
	startIcon?: ReactNode;
	endIcon?: ReactNode;
	loading?: boolean;
	fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
	(
		{
			variant = 'contained',
			size = 'md',
			color = 'primary',
			iconFilled,
			startIcon,
			endIcon,
			loading,
			fullWidth,
			disabled,
			className,
			children,
			...props
		},
		ref
	) => {
		const classNames = [
			styles.button,
			styles[variant],
			styles[size],
			styles[`color-${color}`],
			variant === 'icon' && iconFilled && styles.iconFilled,
			fullWidth && styles.fullWidth,
			loading && styles.loading,
			className,
		]
			.filter(Boolean)
			.join(' ');

		return (
			<button ref={ref} className={classNames} disabled={disabled || loading} {...props}>
				{loading && <span className={styles.spinner} />}
				{!loading && startIcon && <span className={styles.iconSlot}>{startIcon}</span>}
				{variant !== 'icon' && children && <span className={styles.label}>{children}</span>}
				{variant === 'icon' && children}
				{!loading && endIcon && <span className={styles.iconSlot}>{endIcon}</span>}
			</button>
		);
	}
);

Button.displayName = 'Button';
export default Button;
