'use client';

import { Box } from '@mui/material';
import { GridRenderCellParams } from '@mui/x-data-grid-pro';
import RoleValue from './RoleValue';

export default function RoleCell(params: GridRenderCellParams) {
	return (
		<Box width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="center">
			<RoleValue role={params.row.role} />
		</Box>
	);
}
