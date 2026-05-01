'use client';

import RoleValue from './RoleValue';

export default function RoleCell(params: { row: any; value?: any; id?: string | number }) {
	return (
		<div
			style={{
				width: '100%',
				height: '100%',
				display: 'flex',
				justifyContent: 'flex-start',
				alignItems: 'center',
			}}
		>
			<RoleValue role={params.row.role} />
		</div>
	);
}
