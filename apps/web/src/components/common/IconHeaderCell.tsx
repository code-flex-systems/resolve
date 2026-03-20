'use client';
import { JSX } from 'react';

interface IconHeaderCellProps {
	field?: string;
	icon?: JSX.Element;
	colDef?: { headerName?: string };
	headerName?: string;
}

export default function IconHeaderCell(props: IconHeaderCellProps) {
	const headerName = props.headerName ?? props.colDef?.headerName ?? '';
	return (
		<div style={styles.cell} className="flex-row-left">
			{props.icon ?? <></>}
			<span
				style={{
					fontSize: 12,
					fontWeight: 600,
					marginLeft: props.icon ? 5 : undefined,
					color: 'var(--text-secondary)',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					letterSpacing: '0.04em',
				}}
			>
				{headerName.toUpperCase()}
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
