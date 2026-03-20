'use client';

import { Tooltip, IconButton } from '@mui/material';
import { IconInfoCircle } from '@tabler/icons-react';
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
					<IconInfoCircle size={16} style={{ color: 'var(--color-error)' }} />
				</IconButton>
			</Tooltip>
		);
	}

	return (
		<Tooltip
			title={
				<div style={{ padding: 8 }}>
					{!imageLoaded && (
						<div style={{ padding: 16, textAlign: 'center' }}>
							<span style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
								Loading image...
							</span>
						</div>
					)}
					<img
						src={imageUrl}
						alt={alt}
						onError={() => {
							setImageError(true);
						}}
						onLoad={() => {
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
						<div style={{ marginTop: 8, fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
							{description}
						</div>
					)}
				</div>
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
				<IconInfoCircle size={16} style={{ color: imageLoaded ? 'var(--color-primary)' : 'var(--text-secondary)' }} />
			</IconButton>
		</Tooltip>
	);
}
