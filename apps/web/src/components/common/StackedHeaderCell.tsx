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
			}}
		>
			<span style={{ fontSize: 15, lineHeight: '17px', paddingBottom: 2 }}>{primary}</span>
			<span style={{ fontSize: 13, lineHeight: '15px', color: 'var(--text-muted)' }}>
				{secondary}
			</span>
		</div>
	);
}
