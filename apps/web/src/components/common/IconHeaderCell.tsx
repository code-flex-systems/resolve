'use client';
import { JSX } from 'react';

interface IconHeaderCellProps {
	headerName?: string;
	colDef?: { headerName?: string };
	column?: any;
	icon?: JSX.Element;
}

export default function IconHeaderCell(props: IconHeaderCellProps & Record<string, any>) {
	// Resolve header name from multiple sources (explicit > colDef > column id)
	const headerName =
		props.headerName ??
		props.colDef?.headerName ??
		(typeof props.column?.columnDef?.header === 'string' ? props.column.columnDef.header : null) ??
		props.column?.id ??
		'';

	// Format: capitalize and replace underscores with spaces
	const displayName = headerName.replace(/_/g, ' ').toUpperCase();

	return (
		<div style={{ display: 'flex', alignItems: 'center', width: '100%', height: '100%' }}>
			{props.icon ?? null}
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
				{displayName}
			</span>
		</div>
	);
}
