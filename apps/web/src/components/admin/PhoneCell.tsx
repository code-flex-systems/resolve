'use client';

import { Box, Link } from '@mui/material';

export default function PhoneCell({
	value,
	verified,
	disabled,
}: {
	value: string;
	verified: boolean;
	disabled: boolean;
}) {
	return value ? (
		<Box sx={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<Link sx={{ ml: 0.5 }}>{value}</Link>
		</Box>
	) : (
		<>-</>
	);
}
