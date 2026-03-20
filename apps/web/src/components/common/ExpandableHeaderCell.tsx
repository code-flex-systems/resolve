'use client';

import { JSX } from 'react';
import ExpandableTitle from './ExpandableTitle';

interface ExpandableHeaderCellProps {
	field?: string;
	icon: JSX.Element;
	colDef?: { headerName?: string };
	headerName?: string;
}

export default function ExpandableHeaderCell(props: ExpandableHeaderCellProps) {
	const headerName = props.headerName ?? props.colDef?.headerName ?? '';
	return (
		<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<ExpandableTitle title={headerName.toUpperCase()} icon={props.icon} size={25} />
		</div>
	);
}
