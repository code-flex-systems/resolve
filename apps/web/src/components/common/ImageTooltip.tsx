'use client';

import { Tooltip, IconButton, Box, Typography } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useState } from 'react';

interface ImageTooltipProps {
	imageUrl: string;
	description?: string;
	alt?: string;
	maxWidth?: number;
	maxHeight?: number;
}

/**
 * Shows an info icon that displays an image in a tooltip on hover
 */
export default function ImageTooltip({
	imageUrl,
	description,
	alt = 'Reference image',
	maxWidth = 400,
	maxHeight = 400,
}: ImageTooltipProps) {
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	// If image failed to load, fallback to text description
	if (imageError) {
		return (
			<Tooltip title={description || 'Image failed to load'} arrow>
				<IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
					<InfoIcon sx={{ fontSize: 16, color: 'error.main' }} />
				</IconButton>
			</Tooltip>
		);
	}

	return (
		<Tooltip
			title={
				<Box sx={{ p: 1 }}>
					{!imageLoaded && (
						<Box sx={{ p: 2, textAlign: 'center' }}>
							<Typography fontSize={12} color="rgba(255,255,255,0.9)">
								Loading image...
							</Typography>
						</Box>
					)}
					<Box
						component="img"
						src={imageUrl}
						alt={alt}
						onError={() => {
							setImageError(true);
						}}
						onLoad={() => {
							setImageLoaded(true);
						}}
						sx={{
							maxWidth,
							maxHeight,
							width: 'auto',
							height: 'auto',
							display: imageLoaded ? 'block' : 'none',
							borderRadius: 0.5,
						}}
					/>
					{description && imageLoaded && (
						<Box sx={{ mt: 1, fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
							{description}
						</Box>
					)}
				</Box>
			}
			arrow
			slotProps={{
				tooltip: {
					sx: {
						bgcolor: 'rgba(0, 0, 0, 0.9)',
						maxWidth: maxWidth + 40,
						p: 0,
					},
				},
			}}
		>
			<IconButton size="small" sx={{ ml: 0.5, p: 0.5 }}>
				<InfoIcon sx={{ fontSize: 16, color: imageLoaded ? 'primary.main' : 'text.secondary' }} />
			</IconButton>
		</Tooltip>
	);
}
