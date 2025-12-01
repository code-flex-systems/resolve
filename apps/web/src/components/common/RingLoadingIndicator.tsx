'use client';

import theme from '@/styles/theme';
import { Typography } from '@mui/material';
import { Ring } from 'ldrs/react';
import 'ldrs/react/Ring.css';

export default function RingLoadingIndicator({ message }: { message?: string }) {
	return (
		<>
			{message && (
				<Typography fontStyle="italic" color="primary" mb={2}>
					{message}
				</Typography>
			)}
			<Ring size="60" stroke="5" bgOpacity="0.1" speed="2" color={theme.palette.primary.main} />
		</>
	);
}
