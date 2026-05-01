import { JSX } from 'react';

export default function StackedMetric({
	value,
	icon,
	subtext,
	fontSize = 20,
	fontSizeSubtext = 13,
}: {
	value: string;
	icon: JSX.Element;
	subtext: string;
	fontSize?: number;
	fontSizeSubtext?: number;
}) {
	return (
		<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
			<div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
				{icon}
				<div
					style={{
						display: 'flex',
						flexDirection: 'column' as const,
						justifyContent: 'flex-start',
						alignItems: 'flex-start',
						marginLeft: '10px',
					}}
				>
					<span style={{ fontSize: fontSize, lineHeight: '22px' }}>{value}</span>
					<div style={{ maxWidth: 100, paddingTop: '2px' }}>
						<span
							style={{
								fontSize: fontSizeSubtext,
								lineHeight: `${fontSizeSubtext + 2}px`,
								color: 'var(--text-muted)',
							}}
						>
							{subtext}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
