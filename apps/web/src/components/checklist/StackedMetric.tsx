import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Box, Stack, Typography } from '@mui/material';
import { JSX } from 'react';

export default function StackedMetric({
	value,
	icon,
	subtext,
	fontSize = 20,
	fontSizeSubtext = 13,
}: {
	value: string;
	icon: JSX.Element;
	subtext: string;
	fontSize?: number;
	fontSizeSubtext?: number;
}) {
	return (
		<Stack display="flex" justifyContent="center" alignItems="flex-start">
			<Box display="flex" justifyContent="flex-start" alignItems="center">
				{icon}
				<Stack display="flex" justifyContent="flex-start" alignItems="flex-start" marginLeft="10px">
					<Typography fontSize={fontSize} lineHeight="22px">
						{value}
					</Typography>
					<Box maxWidth={100}>
						<Typography fontSize={fontSizeSubtext} color={BASE_COLOR_LIGHT}>
							{subtext}
						</Typography>
					</Box>
				</Stack>
			</Box>
		</Stack>
	);
}
