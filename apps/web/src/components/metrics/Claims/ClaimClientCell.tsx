'use client';
import { formatAmount } from '@/lib/utils/utils';

export default function ClaimClientCell(props: { row: any; value?: any; id?: string | number }) {
	return (
		<div
			style={{
				display: 'flex',
				flexDirection: 'column' as const,
				width: '100%',
				height: '100%',
				justifyContent: 'center',
				alignItems: 'flex-start',
			}}
		>
			<span style={{ fontSize: 14, lineHeight: '17px', paddingBottom: '2px' }}>{props.value}</span>
			<div
				style={{
					display: 'flex',
					width: '100%',
					justifyContent: 'flex-end',
					alignItems: 'center',
					paddingTop: '5px',
				}}
			>
				<span
					style={{
						fontSize: 13,
						lineHeight: '15px',
						color: 'var(--text-muted)',
						paddingRight: '40px',
					}}
				>
					$
				</span>
				<span style={{ fontSize: 13, lineHeight: '15px', color: 'var(--text-muted)' }}>
					{formatAmount(props.row.expected_recovery)}
				</span>
			</div>
		</div>
	);
}

const styles = {
	cell: {
		width: '100%',
		height: '100%',
	},
};
