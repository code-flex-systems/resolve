'use client';

import { forwardRef, type ReactNode } from 'react';
import styles from './Collapse.module.css';

export interface CollapseProps {
	open: boolean;
	children: ReactNode;
	className?: string;
}

const Collapse = forwardRef<HTMLDivElement, CollapseProps>(({ open, children, className }, ref) => {
	const classNames = [styles.collapse, open && styles.open, className].filter(Boolean).join(' ');

	return (
		<div ref={ref} className={classNames}>
			<div className={styles.inner}>{children}</div>
		</div>
	);
});

Collapse.displayName = 'Collapse';
export default Collapse;
