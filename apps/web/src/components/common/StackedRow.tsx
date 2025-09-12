import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Stack, Typography } from '@mui/material';

export function StackedRow({ primary, secondary, fontSize = 15 }: { primary: any; secondary: any; fontSize?: number }) {
	return (
		<Stack
			display="flex"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="flex-start"
			padding="5px 0px"
		>
			<Typography fontSize={fontSize} lineHeight="17px" paddingBottom="2px">
				{primary}
			</Typography>
			<Typography fontSize={fontSize - 2} lineHeight="15px" color={BASE_COLOR_LIGHT}>
				{secondary}
			</Typography>
		</Stack>
	);
}
