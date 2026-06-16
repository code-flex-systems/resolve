'use client';
import { cloneElement, isValidElement, JSX, type ReactElement } from 'react';

interface IconHeaderCellProps {
	headerName?: string;
	colDef?: { headerName?: string };
	column?: any;
	icon?: JSX.Element;
}

function toTitleCase(raw: string) {
	return raw
		.replace(/_/g, ' ')
		.split(' ')
		.map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
		.join(' ');
}

export default function IconHeaderCell(props: IconHeaderCellProps & Record<string, any>) {
	// Resolve header name from multiple sources (explicit > colDef > column id)
	const headerName =
		props.headerName ??
		props.colDef?.headerName ??
		(typeof props.column?.columnDef?.header === 'string' ? props.column.columnDef.header : null) ??
		props.column?.id ??
		'';

	const displayName = toTitleCase(headerName);

	const sizedIcon =
		props.icon && isValidElement(props.icon)
			? cloneElement(props.icon as ReactElement<any>, {
					size: (props.icon as any).props?.size ?? 14,
					stroke: (props.icon as any).props?.stroke ?? 1.75,
				})
			: props.icon;

	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
			{sizedIcon ?? null}
			<span
				style={{
					fontSize: 'var(--text-xs)',
					fontWeight: 600,
					color: 'var(--text-secondary)',
					whiteSpace: 'nowrap',
					overflow: 'hidden',
					textOverflow: 'ellipsis',
					letterSpacing: 'var(--tracking-wide)',
				}}
			>
				{displayName}
			</span>
		</span>
	);
}
