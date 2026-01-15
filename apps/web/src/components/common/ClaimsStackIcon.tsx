'use client';

import { Box, SxProps, Theme } from '@mui/material';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';

interface ClaimsStackIconProps {
	sx?: SxProps<Theme>;
}

/**
 * Custom icon showing two overlapping ContentPasteSearch icons
 * to represent multiple claims. The back icon is clipped to only
 * show where it doesn't overlap with the front icon.
 */
export default function ClaimsStackIcon({ sx }: ClaimsStackIconProps) {
	const iconSize = 18;
	const offset = 5;

	return (
		<Box
			sx={{
				position: 'relative',
				width: 23,
				height: 23,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
				...sx,
			}}
		>
			{/* Back icon - clipped to only show non-overlapping portion */}
			<ContentPasteSearch
				sx={{
					position: 'absolute',
					fontSize: iconSize,
					top: 0,
					left: 0,
					clipPath: `polygon(0 0, 100% 0, 100% ${offset}px, ${offset}px ${offset}px, ${offset}px 100%, 0 100%)`,
				}}
			/>
			{/* Front icon (higher priority, fully visible) */}
			<ContentPasteSearch
				sx={{
					position: 'absolute',
					fontSize: iconSize,
					top: offset,
					left: offset,
				}}
			/>
		</Box>
	);
}
