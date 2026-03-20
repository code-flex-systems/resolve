'use client';
import { formatAmount } from '@/lib/utils/utils';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import { BASE_COLOR_LIGHT } from '@/styles/theme';

export default function ClaimClientCell(props: GridRenderCellParams) {
	return (
		<div      style={{ display: 'flex', width: '100%', height: '100%', justifyContent: 'center', alignItems: 'flex-start' }}>
			<span    style={{ fontSize: 14, lineHeight: '17px', paddingBottom: '2px' }}>
				{props.value}
			</span>
			<div      style={{ display: 'flex', width: '100%', justifyContent: 'flex-end', alignItems: 'center', paddingTop: '5px' }}>
				<span     style={{ fontSize: 13, lineHeight: '15px', color: BASE_COLOR_LIGHT, paddingRight: '40px' }}>
					$
				</span>
				<span    style={{ fontSize: 13, lineHeight: '15px', color: BASE_COLOR_LIGHT }}>
					{formatAmount(props.row.expected_recovery)}
				</span>
			</div>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
