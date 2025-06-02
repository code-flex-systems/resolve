'use client';
import { Typography } from '@mui/material';
import { formatAmount } from '@/lib/utils/utils';
import { GridRenderCellParams } from '@mui/x-data-grid';

export default function ClaimAmountCell(props: GridRenderCellParams) {
	return (
		<div style={styles.cell} className="flex-row-between">
			<Typography fontSize={14}>$</Typography>
			<Typography fontSize={14}>{formatAmount(props.value)}</Typography>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
