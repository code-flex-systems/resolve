'use client';

import { JSX, useEffect, useState } from 'react';
import styles from './ExpandableTitle.module.css';

export default function ExpandableTitle({
	title,
	icon,
	color = 'var(--color-primary)',
	bgcolor = '#F0F3F7',
	padding,
	size = 30,
}: {
	title: string;
	icon: JSX.Element;
	color?: string;
	bgcolor?: string;
	padding?: string;
	size?: number;
}) {
	const [showTitle, setShowTitle] = useState(false);
	useEffect(() => {
		setShowTitle(true);
		return () => setShowTitle(false);
	}, []);
	return (
		<div className={styles.container} style={{ padding }}>
			<div
				className={styles.iconCircle}
				style={{ backgroundColor: color, width: size, height: size }}
			>
				{icon}
			</div>
			<div
				className={`${styles.titlePill} ${showTitle ? styles.titlePillExpanded : styles.titlePillCollapsed}`}
				style={{ backgroundColor: bgcolor, paddingLeft: size }}
			>
				<span className={styles.titleText}>
					{title}
				</span>
			</div>
		</div>
	);
}
