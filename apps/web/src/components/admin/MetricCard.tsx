'use client';

import { Box, Typography } from '@mui/material';
import { ReactNode } from 'react';
import { containerStyles, TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';

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
		<Box
			sx={{
				...containerStyles.beveledCard,
				p: 3,
				display: 'flex',
				alignItems: 'center',
				gap: 2.5,
				minWidth: 280,
				flex: 1,
			}}
		>
			{/* Icon circle */}
			<Box
				sx={{
					width: 50,
					height: 50,
					borderRadius: '50%',
					backgroundColor: iconBgColor,
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					'& .MuiSvgIcon-root': {
						color: iconColor,
						fontSize: 26,
					},
				}}
			>
				{icon}
			</Box>

			{/* Content */}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				<Typography
					sx={{
						fontSize: 40,
						fontWeight: 700,
						lineHeight: 1,
						color: TEXT_PRIMARY,
						mb: 0.5,
					}}
				>
					{value}
				</Typography>
				<Typography
					sx={{
						fontSize: 14,
						fontWeight: 600,
						color: TEXT_PRIMARY,
						mb: 0.25,
					}}
				>
					{label}
				</Typography>
				<Typography
					sx={{
						fontSize: 13,
						color: TEXT_SECONDARY,
					}}
				>
					{subtitle}
				</Typography>
			</Box>

			{/* Trend indicator (optional) */}
			{trend && (
				<Box
					sx={{
						alignSelf: 'flex-start',
						pt: 0.5,
					}}
				>
					<Typography
						sx={{
							fontSize: 16,
							fontWeight: 600,
							color: trend.isPositive ? '#10b981' : '#ef4444',
						}}
					>
						{trend.value}
					</Typography>
				</Box>
			)}
		</Box>
	);
}
