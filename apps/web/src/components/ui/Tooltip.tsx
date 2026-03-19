'use client';

import { forwardRef, type ReactElement, type ReactNode } from 'react';
import styles from './Tooltip.module.css';

export interface TooltipProps {
	content: ReactNode;
	position?: 'top' | 'bottom' | 'left' | 'right';
	children: ReactElement;
	className?: string;
}

const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(
	({ content, position = 'top', children, className }, ref) => {
		const classNames = [styles.wrapper, className].filter(Boolean).join(' ');

		return (
			<span ref={ref} className={classNames}>
				{children}
				<span className={[styles.tooltip, styles[position]].filter(Boolean).join(' ')}>
					{content}
				</span>
			</span>
		);
	}
);

Tooltip.displayName = 'Tooltip';
export default Tooltip;
