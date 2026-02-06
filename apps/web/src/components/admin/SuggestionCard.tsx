'use client';

import { Box, Typography, Chip } from '@mui/material';
import { containerStyles, TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
		<Box
			onClick={onClick}
			sx={{
				...containerStyles.beveledCard,
				p: 2.5,
				display: 'flex',
				alignItems: 'flex-start',
				gap: 2,
				position: 'relative',
				cursor: onClick ? 'pointer' : 'default',
				transition: 'all 0.2s ease',
				'&:hover': onClick
					? {
							borderColor: '#21B5FF',
							backgroundColor: 'rgba(33, 181, 255, 0.02)',
							transform: 'translateY(-2px)',
							boxShadow:
								'inset 0 1px 0 0 rgba(255, 255, 255, 0.8), 0 4px 12px 0 rgba(33, 181, 255, 0.15)',
							'& .suggestion-icon': {
								backgroundColor: '#21B5FF',
								'& .MuiSvgIcon-root': {
									color: 'white',
								},
							},
							'& .arrow-icon': {
								color: '#21B5FF',
								transform: 'translateX(4px)',
							},
						}
					: {},
			}}
		>
			{/* Severity chip (top right) */}
			{severityChip && (
				<Box sx={{ position: 'absolute', top: 12, right: 12 }}>{severityChip}</Box>
			)}

			{/* Icon */}
			<Box
				className="suggestion-icon"
				sx={{
					width: 44,
					height: 44,
					borderRadius: '10px',
					backgroundColor: '#f1f5f9',
					display: 'flex',
					alignItems: 'center',
					justifyContent: 'center',
					flexShrink: 0,
					transition: 'all 0.2s ease',
					'& .MuiSvgIcon-root': {
						color: TEXT_SECONDARY,
						fontSize: 22,
						transition: 'color 0.2s ease',
					},
				}}
			>
				{icon}
			</Box>

			{/* Content */}
			<Box sx={{ flex: 1, minWidth: 0 }}>
				{/* Title */}
				<Typography
					sx={{
						fontSize: 15,
						fontWeight: 600,
						color: TEXT_PRIMARY,
						mb: 0.5,
					}}
				>
					{title}
				</Typography>

				{/* Subtitle */}
				<Typography
					sx={{
						fontSize: 13,
						color: TEXT_SECONDARY,
						mb: 1,
					}}
				>
					{subtitle}
				</Typography>

				{/* Benefit (green check) */}
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
					<CheckCircleIcon sx={{ fontSize: 16, color: '#10b981' }} />
					<Typography
						sx={{
							fontSize: 13,
							fontWeight: 500,
							color: '#10b981',
						}}
					>
						{benefit}
					</Typography>
				</Box>

				{/* Details */}
				<Typography
					sx={{
						fontSize: 13,
						color: TEXT_SECONDARY,
					}}
				>
					{details}
				</Typography>
			</Box>

			{/* Arrow icon (appears on hover) */}
			{onClick && (
				<Box
					className="arrow-icon"
					sx={{
						alignSelf: 'center',
						transition: 'all 0.2s ease',
					}}
				>
					<ArrowForwardIcon sx={{ fontSize: 20, color: TEXT_SECONDARY }} />
				</Box>
			)}
		</Box>
	);
}
