'use client';
import { AccountCircle, Tag } from '@mui/icons-material';
import { Typography } from '@mui/material';
import { GridColumnHeaderParams } from '@mui/x-data-grid';

export default function ClaimHeaderCell(params: GridColumnHeaderParams) {
	const getIcon = () => {
		switch (params.field) {
			case 'claim_number':
				return <Tag />;
			case 'client':
				return <AccountCircle />;
			default:
				return;
		}
	};
	let icon = getIcon();
	return (
		<div style={styles.cell} className="flex-row-left">
			{icon ?? <></>}
			<Typography fontSize={15} fontWeight="bold" marginLeft={icon ? '5px' : undefined} noWrap>
				{params.colDef.headerName}
			</Typography>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
