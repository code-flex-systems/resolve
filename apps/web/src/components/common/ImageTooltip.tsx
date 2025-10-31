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

	console.log('ImageTooltip rendering with URL:', imageUrl);

	// If image failed to load, fallback to text description
	if (imageError) {
		return (
			<Tooltip title={description || 'Image failed to load'} arrow>
				<IconButton size="small" sx={{ ml: 0.5, padding: 0.5 }}>
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
					<img
						src={imageUrl}
						alt={alt}
						onError={(e) => {
							console.error('Image failed to load:', imageUrl);
							console.error('Error event:', e);
							// Try to fetch the URL to see what the actual error is
							fetch(imageUrl)
								.then((res) => {
									console.error('Fetch response status:', res.status);
									return res.text();
								})
								.then((text) => {
									console.error('Fetch response body:', text);
								})
								.catch((err) => {
									console.error('Fetch error:', err);
								});
							setImageError(true);
						}}
						onLoad={() => {
							console.log('Image loaded successfully:', imageUrl);
							setImageLoaded(true);
						}}
						style={{
							maxWidth,
							maxHeight,
							width: 'auto',
							height: 'auto',
							display: imageLoaded ? 'block' : 'none',
							borderRadius: 4,
						}}
					/>
					{description && imageLoaded && (
						<Box mt={1} fontSize={12} color="rgba(255,255,255,0.9)">
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
						padding: 0,
					},
				},
			}}
		>
			<IconButton size="small" sx={{ ml: 0.5, padding: 0.5 }}>
				<InfoIcon sx={{ fontSize: 16, color: imageLoaded ? 'primary.main' : 'text.secondary' }} />
			</IconButton>
		</Tooltip>
	);
}
