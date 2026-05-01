'use client';

import { JSX } from 'react';
import css from './Toolbar.module.css';

export default function Toolbar(props: {
	height?: string | number;
	padding?: string | number;
	left?: JSX.Element;
	leftWidth?: string;
	right?: JSX.Element;
	rightWidth?: string;
	backgroundColor?: string;
}) {
	const {
		height = 36,
		padding = '0 12px',
		left,
		leftWidth,
		right,
		rightWidth,
		backgroundColor,
	} = props;
	return (
		<div
			className={css.toolbar}
			style={{
				height,
				minHeight: height,
				padding: typeof padding === 'string' ? padding : `0 ${padding}px`,
				backgroundColor,
			}}
		>
			<div className={css.left} style={{ width: leftWidth ?? '50%' }}>
				{left}
			</div>
			<div className={css.right} style={{ width: rightWidth ?? '50%' }}>
				{right}
			</div>
		</div>
	);
}
