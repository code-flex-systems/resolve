'use client';

import { IconFileSearch } from '@tabler/icons-react';

/**
 * Custom icon showing two overlapping file-search icons
 * to represent multiple claims. The back icon is clipped to only
 * show where it doesn't overlap with the front icon.
 */
export default function ClaimsStackIcon() {
	const iconSize = 18;
	const offset = 5;

	return (
		<div
			style={{
				position: 'relative',
				width: 23,
				height: 23,
				display: 'flex',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			{/* Back icon - clipped to only show non-overlapping portion */}
			<IconFileSearch
				size={iconSize}
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					clipPath: `polygon(0 0, 100% 0, 100% ${offset}px, ${offset}px ${offset}px, ${offset}px 100%, 0 100%)`,
				}}
			/>
			{/* Front icon (higher priority, fully visible) */}
			<IconFileSearch
				size={iconSize}
				style={{
					position: 'absolute',
					top: offset,
					left: offset,
				}}
			/>
		</div>
	);
}
