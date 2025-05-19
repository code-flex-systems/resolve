'use client';
import { Typography } from '@mui/material';
import { GridColumnHeaderParams } from '@mui/x-data-grid';
import { JSX } from 'react';

export default function IconHeaderCell(params: GridColumnHeaderParams & { icon?: JSX.Element }) {
	return (
		<div style={styles.cell} className="flex-row-left">
			{params.icon ?? <></>}
			<Typography fontSize={15} fontWeight="bold" marginLeft={params.icon ? '5px' : undefined} noWrap>
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
