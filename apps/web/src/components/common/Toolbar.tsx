'use client';
import { Box } from '@mui/material';
import { JSX } from 'react';

export default function Toolbar(props: {
	height?: string | number;
	padding?: string | number;
	left?: JSX.Element;
	leftWidth?: string;
	right?: JSX.Element;
	rightWidth?: string;
	backgroundColor?: string;
}) {
	const { height = 36, padding = '0 12px', left, leftWidth, right, rightWidth, backgroundColor } = props;
	return (
		<Box
			sx={{
				width: '100%',
				height,
				minHeight: height,
				p: typeof padding === 'string' ? padding : undefined,
				px: typeof padding === 'number' ? padding / 8 : undefined,
				bgcolor: backgroundColor,
				display: 'flex',
				justifyContent: 'space-between',
				alignItems: 'center',
				gap: 1,
			}}
		>
			<Box
				sx={{
					width: leftWidth ?? '50%',
					display: 'flex',
					justifyContent: 'flex-start',
					alignItems: 'center',
					gap: 0.5,
				}}
			>
				{left}
			</Box>
			<Box
				sx={{
					width: rightWidth ?? '50%',
					display: 'flex',
					justifyContent: 'flex-end',
					alignItems: 'center',
					gap: 0.5,
				}}
			>
				{right}
			</Box>
		</Box>
	);
}
