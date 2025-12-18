'use client';

import theme, { containerStyles } from '@/styles/theme';
import { Box, Paper, Typography } from '@mui/material';
import { Cardio } from 'ldrs/react';
import 'ldrs/react/Cardio.css';

interface CardioLoadingIndicatorProps {
	message?: string;
	size?: number;
	stroke?: number;
	speed?: number;
	fullScreen?: boolean;
	showCard?: boolean;
}

export default function CardioLoadingIndicator({
	message,
	size = 50,
	stroke = 4,
	speed = 2,
	fullScreen = false,
	showCard = true,
}: CardioLoadingIndicatorProps) {
	const content = (
		<>
			{message && (
				<Typography fontStyle="italic" color="primary" mb={2}>
					{message}
				</Typography>
			)}
			<Cardio size={size.toString()} stroke={stroke.toString()} speed={speed.toString()} color={theme.palette.primary.main} />
		</>
	);

	const cardContent = showCard ? (
		<Paper sx={{ ...containerStyles.beveledCard, padding: '40px 60px' }}>
			<Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
				{content}
			</Box>
		</Paper>
	) : (
		<Box display="flex" flexDirection="column" alignItems="center" justifyContent="center">
			{content}
		</Box>
	);

	if (fullScreen) {
		return (
			<Box
				sx={{
					width: '100%',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				{cardContent}
			</Box>
		);
	}

	return cardContent;
}
