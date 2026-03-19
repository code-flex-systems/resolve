'use client';

import { forwardRef } from 'react';
import styles from './Skeleton.module.css';

export interface SkeletonProps {
	variant?: 'text' | 'rect' | 'circle';
	width?: string | number;
	height?: string | number;
	className?: string;
}

const Skeleton = forwardRef<HTMLSpanElement, SkeletonProps>(
	({ variant = 'text', width, height, className }, ref) => {
		const classNames = [styles.skeleton, styles[variant], className]
			.filter(Boolean)
			.join(' ');

		const style: React.CSSProperties = {};

		if (width !== undefined) {
			style.width = typeof width === 'number' ? `${width}px` : width;
		}
		if (height !== undefined) {
			style.height = typeof height === 'number' ? `${height}px` : height;
		}

		if (variant === 'circle' && width !== undefined && height === undefined) {
			style.height = style.width;
		}

		return <span ref={ref} className={classNames} style={style} />;
	}
);

Skeleton.displayName = 'Skeleton';
export default Skeleton;
