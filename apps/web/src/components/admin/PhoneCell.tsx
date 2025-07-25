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
		<div style={{ width: '100%' }} className="flex-row-left">
			<Link marginLeft="5px">{value}</Link>
		</div>
	) : (
		<>-</>
	);
}

const styles = {
	icon: {
		fontSize: 17,
		cursor: 'pointer',
	},
};
