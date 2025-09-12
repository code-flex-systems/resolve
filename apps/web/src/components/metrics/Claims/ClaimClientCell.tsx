'use client';
import { Box, Stack, Typography } from '@mui/material';
import { formatAmount } from '@/lib/utils/utils';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function ClaimClientCell(props: GridRenderCellParams) {
	return (
		<Stack display="flex" width="100%" height="100%" justifyContent="center" alignItems="flex-start">
			<Typography fontSize={14} lineHeight="17px" paddingBottom="2px">
				{props.value}
			</Typography>
			<Box display="flex" width="100%" justifyContent="flex-end" alignItems="center" paddingTop="5px">
				<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT} paddingRight="40px">
					$
				</Typography>
				<Typography fontSize={13} lineHeight="15px" color={BASE_COLOR_LIGHT}>
					{formatAmount(props.row.expected_recovery)}
				</Typography>
			</Box>
		</Stack>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
