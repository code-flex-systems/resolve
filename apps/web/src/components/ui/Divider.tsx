'use client';

import { forwardRef } from 'react';
import styles from './Divider.module.css';

export interface DividerProps {
	orientation?: 'horizontal' | 'vertical';
	spacing?: 'none' | 'sm' | 'md' | 'lg';
	className?: string;
}

const Divider = forwardRef<HTMLHRElement, DividerProps>(
	({ orientation = 'horizontal', spacing = 'none', className }, ref) => {
		const classNames = [
			styles.divider,
			styles[orientation],
			spacing !== 'none' && styles[`spacing-${spacing}`],
			className,
		]
			.filter(Boolean)
			.join(' ');

		return <hr ref={ref} className={classNames} />;
	}
);

Divider.displayName = 'Divider';
export default Divider;
