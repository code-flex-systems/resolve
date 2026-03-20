'use client';
import { formatAmount } from '@/lib/utils/utils';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';

export default function ClaimAmountCell(props: GridRenderCellParams) {
	return (
		<div style={styles.cell} className="flex-row-between">
			<span style={{ fontSize: 14 }}>$</span>
			<span style={{ fontSize: 14 }}>{props.value ? formatAmount(props.value) : '0.00'}</span>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
