'use client';
import { useState } from 'react';
import styles from './PageDot.module.css';

export default function PageDot(props: { id: number; onClick: () => void; filled?: boolean; disabled?: boolean }) {
	const [hovered, setHovered] = useState(false);
	const isFilled = props.filled || props.disabled || hovered;
	return (
		<div
			className={`${styles.dot} ${isFilled ? styles.active : styles.inactive} ${!props.disabled ? styles.clickable : ''}`}
			style={{
				width: props.disabled ? 5 : 10,
				height: props.disabled ? 5 : 10,
			}}
			onClick={props.disabled ? undefined : props.onClick}
			onMouseEnter={props.disabled ? undefined : () => setHovered(true)}
			onMouseLeave={props.disabled ? undefined : () => setHovered(false)}
		/>
	);
}
