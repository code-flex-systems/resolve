'use client';

import { type ReactNode } from 'react';
import Card from './Card';
import styles from './KpiCard.module.css';

export interface KpiCardProps {
	/** Large display value (number, formatted string, etc.) */
	value: ReactNode;
	/** Primary label below the value */
	label: string;
	/** Secondary text below the label */
	subtitle?: string;
	/** Color treatment for the subtitle: positive (green), negative (red), or default (muted) */
	subtitleColor?: 'positive' | 'negative' | 'default';
	/** Optional icon displayed in a colored circle */
	icon?: ReactNode;
	/** Icon circle color (e.g., 'var(--text-accent)') */
	iconColor?: string;
	/** Icon circle background color (e.g., 'var(--status-info-bg)') */
	iconBgColor?: string;
	/** Optional trend indicator in the top-right corner */
	trend?: {
		value: string;
		isPositive: boolean;
	};
	/** Size: lg (default, dashboard), sm (compact, inline) */
	size?: 'sm' | 'lg';
	/** Additional class name */
	className?: string;
}

export default function KpiCard({
	value,
	label,
	subtitle,
	subtitleColor = 'default',
	icon,
	iconColor,
	iconBgColor,
	trend,
	size = 'lg',
	className,
}: KpiCardProps) {
	const subtitleCls = [
		styles.subtitle,
		subtitleColor === 'positive' && styles.subtitlePositive,
		subtitleColor === 'negative' && styles.subtitleNegative,
	]
		.filter(Boolean)
		.join(' ');

	return (
		<Card variant="beveled" padding={size === 'sm' ? 'sm' : 'lg'} className={`${styles.card} ${styles[size]} ${className ?? ''}`}>
			{icon && (
				<div
					className={styles.iconCircle}
					style={{
						backgroundColor: iconBgColor ?? 'var(--bg-tertiary)',
						color: iconColor ?? 'var(--text-secondary)',
					}}
				>
					{icon}
				</div>
			)}

			<div className={styles.content}>
				<span className={styles.value}>{value}</span>
				<span className={styles.label}>{label}</span>
				{subtitle && <span className={subtitleCls}>{subtitle}</span>}
			</div>

			{trend && (
				<div className={styles.trend}>
					<span
						className={styles.trendValue}
						style={{ color: trend.isPositive ? 'var(--status-success)' : 'var(--status-error)' }}
					>
						{trend.value}
					</span>
				</div>
			)}
		</Card>
	);
}
