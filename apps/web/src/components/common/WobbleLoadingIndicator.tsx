'use client';

import theme from '@/styles/theme';
import { Typography } from '@mui/material';
import { LineWobble } from 'ldrs/react';
import 'ldrs/react/LineWobble.css';

export default function WobbleLoadingIndicator() {
	return (
		<>
			<Typography fontStyle="italic" color="primary">
				Loading...
			</Typography>
			<LineWobble size="200" stroke="5" bgOpacity="0.1" speed="2" color={theme.palette.primary.main} />
		</>
	);
}
