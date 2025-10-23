import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Box, Stack, Typography } from '@mui/material';
import { JSX } from 'react';

export default function CustomNoRowsOverlay({ text, icon }: { text: string; icon: JSX.Element }) {
	return (
		<div
			style={{
				display: 'flex',
				height: '100%',
				width: '100%',
				alignItems: 'center',
				justifyContent: 'center',
			}}
		>
			<Box width={200} display="flex" justifyContent="center" alignItems="center">
				{icon}
				<Typography fontSize={15} color={BASE_COLOR_LIGHT} paddingLeft="10px">
					{text}
				</Typography>
			</Box>
		</div>
	);
}
