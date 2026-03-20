'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import css from './BasicIconButton.module.css';

interface BasicIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	compact?: boolean;
	/** @deprecated kept for MUI compat — ignored */
	sx?: unknown;
}

const BasicIconButton = forwardRef<HTMLButtonElement, BasicIconButtonProps>(
	({ compact, sx: _sx, className, ...props }, ref) => {
		const classNames = [css.iconButton, compact && css.compact, className].filter(Boolean).join(' ');
		return (
			<button ref={ref} type="button" className={classNames} {...props}>
				{props.children}
			</button>
		);
	}
);

BasicIconButton.displayName = 'BasicIconButton';
export default BasicIconButton;
