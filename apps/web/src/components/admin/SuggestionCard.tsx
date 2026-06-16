'use client';

import { IconArrowRight, IconCircleCheck } from '@tabler/icons-react';
import Chip from '@/components/ui/Chip';
import Card from '@/components/ui/Card';

interface SuggestionCardProps {
	icon: React.ReactNode;
	title: string;
	subtitle: string;
	benefit: string;
	details: string;
	severityChip?: React.ReactNode;
	onClick?: () => void;
}

/**
 * SuggestionCard - Displays a single workflow suggestion with hover effects
 * Layout matches the provided UX screenshots
 */
export default function SuggestionCard({
	icon,
	title,
	subtitle,
	benefit,
	details,
	severityChip,
	onClick,
}: SuggestionCardProps) {
	return (
		<Card
			variant="beveled"
			padding="md"
			onClick={onClick}
			style={{
				display: 'flex',
				alignItems: 'flex-start',
				gap: 16,
				position: 'relative',
				cursor: onClick ? 'pointer' : 'default',
				transition: 'all 0.2s ease',
			}}
		>
			{/* Severity chip (top right) */}
			{severityChip && (
				<div style={{ position: 'absolute', top: 12, right: 12 }}>{severityChip}</div>
			)}

			{/* Icon */}
			<div
				className="suggestion-icon"
				style={{
					width: 44,
					height: 44,
					borderRadius: '10px',
					backgroundColor: 'var(--bg-secondary)',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					transition: 'all 0.2s ease',
				}}
			>
				{icon}
			</div>

			{/* Content */}
			<div style={{ flex: 1, minWidth: 0 }}>
				{/* Title */}
				<span
					style={{
						fontSize: 15,
						fontWeight: 600,
						color: 'var(--text-primary)',
						marginBottom: 4,
					}}
				>
					{title}
				</span>

				{/* Subtitle */}
				<span
					style={{
						fontSize: 13,
						color: 'var(--text-secondary)',
						marginBottom: 8,
					}}
				>
					{subtitle}
				</span>

				{/* Benefit (green check) */}
				<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
					<IconCircleCheck size={16} style={{ color: 'var(--status-success)' }} />
					<span
						style={{
							fontSize: 13,
							fontWeight: 500,
							color: 'var(--status-success)',
						}}
					>
						{benefit}
					</span>
				</div>

				{/* Details */}
				<span
					style={{
						fontSize: 13,
						color: 'var(--text-secondary)',
					}}
				>
					{details}
				</span>
			</div>

			{/* Arrow icon (appears on hover) */}
			{onClick && (
				<div
					className="arrow-icon"
					style={{
						alignSelf: 'center',
						transition: 'all 0.2s ease',
					}}
				>
					<IconArrowRight size={20} style={{ color: 'var(--text-secondary)' }} />
				</div>
			)}
		</Card>
	);
}
