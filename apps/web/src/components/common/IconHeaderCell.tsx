'use client';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { Typography } from '@mui/material';
import { GridColumnHeaderParams } from '@mui/x-data-grid-pro';
import { JSX } from 'react';

export default function IconHeaderCell(params: GridColumnHeaderParams & { icon?: JSX.Element }) {
	return (
		<div style={styles.cell} className="flex-row-left">
			{params.icon ?? <></>}
			<Typography fontSize={15} marginLeft={params.icon ? '5px' : undefined} color={BASE_COLOR_LIGHT} noWrap>
				{params.colDef.headerName?.toUpperCase() ?? ''}
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
