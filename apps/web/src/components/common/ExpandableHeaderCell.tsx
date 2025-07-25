'use client';

import { GridColumnHeaderParams } from '@mui/x-data-grid-pro';
import { JSX } from 'react';
import { Box } from '@mui/material';
import ExpandableTitle from './ExpandableTitle';

export default function ExpandableHeaderCell(params: GridColumnHeaderParams & { icon: JSX.Element }) {
	return (
		<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
			<ExpandableTitle title={params.colDef.headerName?.toUpperCase() ?? ''} icon={params.icon} size={25} />
		</Box>
	);
}
