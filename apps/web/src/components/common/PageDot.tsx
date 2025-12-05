'use client';
import { Box } from '@mui/material';
import { useState } from 'react';

export default function PageDot(props: { id: number; onClick: () => void; filled?: boolean; disabled?: boolean }) {
	const [hovered, setHovered] = useState(false);
	return (
		<Box
			sx={{
				width: props.disabled ? 5 : 10,
				height: props.disabled ? 5 : 10,
				m: 0.5,
				borderRadius: 25,
				outline: '1px solid var(--color-primary)',
				bgcolor: props.filled || props.disabled || hovered ? 'var(--color-primary)' : 'white',
				transition: 'background-color 300ms ease, width 300ms ease, height 100ms ease',
				cursor: props.disabled ? undefined : 'pointer',
			}}
			onClick={props.disabled ? undefined : props.onClick}
			onMouseEnter={props.disabled ? undefined : () => setHovered(true)}
			onMouseLeave={props.disabled ? undefined : () => setHovered(false)}
		/>
	);
}
