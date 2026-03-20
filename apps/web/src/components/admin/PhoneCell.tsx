'use client';
import { Link } from '@mui/material';


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
			<Link style={{ marginLeft: 4 }}>{value}</Link>
		</div>
	) : (
		<>-</>
	);
}
