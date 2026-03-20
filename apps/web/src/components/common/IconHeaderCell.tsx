'use client';
import { GridColumnHeaderParams } from '@mui/x-data-grid-pro';
import { JSX } from 'react';

export default function IconHeaderCell(params: GridColumnHeaderParams & { icon?: JSX.Element }) {
	return (
		<div style={styles.cell} className="flex-row-left">
			{params.icon ?? <></>}
			<span
				style={{
					fontSize: 15,
					marginLeft: params.icon ? 5 : undefined,
					color: 'var(--text-muted)',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
				}}
			>
				{params.colDef.headerName?.toUpperCase() ?? ''}
			</span>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
