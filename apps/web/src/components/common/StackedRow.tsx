import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Stack, Typography } from '@mui/material';

export function StackedRow({ primary, secondary }: { primary: any; secondary: any }) {
	return (
		<Stack
			display="flex"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="flex-start"
			padding="5px 0px"
		>
			<Typography fontSize={15} lineHeight="17px" paddingBottom="2px">
				{primary}
			</Typography>
			<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
				{secondary}
			</Typography>
		</Stack>
	);
}
