'use client';


export default function PhoneCell({
	value,
	verified,
	disabled,
}: {
	value: string;
	verified: boolean;
	disabled: boolean;
}) {
	return value ? (
		<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'center' }}>
			<span style={{ marginLeft: 4, color: 'var(--text-accent)' }}>{value}</span>
		</div>
	) : (
		<>-</>
	);
}
