'use client';

import theme from '@/styles/theme';

export default function Separator(props: { color?: string }) {
	return (
		<div
			style={{
				width: 14,
				minWidth: 14,
				height: 4,
				margin: '0px 10px',
				backgroundColor: props.color ?? theme.palette.primary.main,
				borderRadius: 4,
			}}
		/>
	);
}
