'use client';

import { Stack, Typography } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function StackedHeaderCell({ primary, secondary }: { primary: any; secondary: any }) {
	return (
		<Stack display="flex" width="100%" height="100%" justifyContent="center" alignItems="flex-start">
			<Typography fontSize={15} lineHeight="17px" paddingBottom="2px">
				{primary}
			</Typography>
			<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
				{secondary}
			</Typography>
		</Stack>
	);
}
