'use client';

export default function StackedHeaderCell({
	primary,
	secondary,
}: {
	primary: any;
	secondary: any;
}) {
	return (
		<div
			style={{
				display: 'flex',
				width: '100%',
				height: '100%',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'flex-start',
				minWidth: 0,
				overflow: 'hidden',
			}}
		>
			<span
				className="truncate"
				style={{ fontSize: 15, lineHeight: '17px', paddingBottom: 2, maxWidth: '100%' }}
			>
				{primary}
			</span>
			<span
				className="truncate"
				style={{ fontSize: 13, lineHeight: '15px', color: 'var(--text-muted)', maxWidth: '100%' }}
			>
				{secondary}
			</span>
		</div>
	);
}
