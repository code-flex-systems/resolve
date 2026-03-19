'use client';

import { type ReactNode } from 'react';
import styles from './Badge.module.css';

export interface BadgeProps {
	content?: ReactNode;
	color?: 'primary' | 'error' | 'success' | 'warning';
	children: ReactNode;
	className?: string;
}

function Badge({ content, color = 'primary', children, className }: BadgeProps) {
	const wrapperClasses = [styles.wrapper, className].filter(Boolean).join(' ');

	const badgeClasses = [
		styles.badge,
		styles[`color-${color}`],
		content != null ? styles.content : styles.dot,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<span className={wrapperClasses}>
			{children}
			<span className={badgeClasses}>{content != null ? content : null}</span>
		</span>
	);
}

Badge.displayName = 'Badge';
export default Badge;
