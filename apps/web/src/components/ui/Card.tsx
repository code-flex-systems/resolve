'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
	variant?: 'float' | 'beveled' | 'surface' | 'flat';
	padding?: 'none' | 'sm' | 'md' | 'lg';
	className?: string;
	children: ReactNode;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
	({ variant = 'beveled', padding = 'md', className, children, ...props }, ref) => {
		const classNames = [styles.card, styles[variant], styles[`padding-${padding}`], className]
			.filter(Boolean)
			.join(' ');

		return (
			<div ref={ref} className={classNames} {...props}>
				{children}
			</div>
		);
	}
);

Card.displayName = 'Card';
export default Card;
