'use client';

import { ReactNode } from 'react';
import Card from '@/components/ui/Card';

interface MetricCardProps {
	icon: ReactNode;
	iconColor: string;
	iconBgColor: string;
	value: string | number;
	label: string;
	subtitle: string;
	trend?: {
		value: string;
		isPositive: boolean;
	};
}

/**
 * MetricCard component for displaying key metrics on dashboards
 * Based on beveled card styling with icon, large value display, and optional trend indicator
 */
export default function MetricCard({
	icon,
	iconColor,
	iconBgColor,
	value,
	label,
	subtitle,
	trend,
}: MetricCardProps) {
	return (
		<Card
			variant="beveled"
			padding="lg"
			style={{
				display: 'flex',
				alignItems: 'center',
				gap: 20,
				minWidth: 280,
				flex: 1,
			}}
		>
			{/* Icon circle */}
			<div
				style={{
					width: 50,
					height: 50,
					borderRadius: '50%',
					backgroundColor: iconBgColor,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					}}
			>
				{icon}
			</div>

			{/* Content */}
			<div style={{ flex: 1, minWidth: 0 }}>
				<span
					style={{
						fontSize: 40,
						fontWeight: 700,
						lineHeight: 1,
						color: 'var(--text-primary)',
						marginBottom: 4,
					}}
				>
					{value}
				</span>
				<span
					style={{
						fontSize: 14,
						fontWeight: 600,
						color: 'var(--text-primary)',
						marginBottom: 2,
					}}
				>
					{label}
				</span>
				<span
					style={{
						fontSize: 13,
						color: 'var(--text-secondary)',
					}}
				>
					{subtitle}
				</span>
			</div>

			{/* Trend indicator (optional) */}
			{trend && (
				<div
					style={{
						alignSelf: 'flex-start',
						paddingTop: 4,
					}}
				>
					<span
						style={{
							fontSize: 16,
							fontWeight: 600,
							color: trend.isPositive ? 'var(--status-success)' : 'var(--status-error)',
						}}
					>
						{trend.value}
					</span>
				</div>
			)}
		</Card>
	);
}
