'use client';

import { forwardRef, useState, useRef, type ReactElement, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Tooltip.module.css';

export interface TooltipProps {
	content: ReactNode;
	position?: 'top' | 'bottom' | 'left' | 'right';
	children: ReactElement;
	className?: string;
}

const Tooltip = forwardRef<HTMLSpanElement, TooltipProps>(
	({ content, position = 'top', children, className }, ref) => {
		const [visible, setVisible] = useState(false);
		const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
		const wrapperRef = useRef<HTMLSpanElement>(null);

		const handleEnter = () => {
			const el = wrapperRef.current;
			if (!el) return;
			const rect = el.getBoundingClientRect();
			let top = 0;
			let left = 0;
			switch (position) {
				case 'top':
					top = rect.top - 8;
					left = rect.left + rect.width / 2;
					break;
				case 'bottom':
					top = rect.bottom + 8;
					left = rect.left + rect.width / 2;
					break;
				case 'left':
					top = rect.top + rect.height / 2;
					left = rect.left - 8;
					break;
				case 'right':
					top = rect.top + rect.height / 2;
					left = rect.right + 8;
					break;
			}
			setCoords({ top, left });
			setVisible(true);
		};

		const handleLeave = () => {
			setVisible(false);
		};

		const tooltipCls = [styles.tooltipFixed, styles[position]].filter(Boolean).join(' ');

		return (
			<>
				<span
					ref={(node) => {
						(wrapperRef as any).current = node;
						if (typeof ref === 'function') ref(node);
						else if (ref) (ref as any).current = node;
					}}
					className={[styles.wrapper, className].filter(Boolean).join(' ')}
					onMouseEnter={handleEnter}
					onMouseLeave={handleLeave}
				>
					{children}
				</span>
				{visible && coords && content && createPortal(
					<div
						className={tooltipCls}
						style={{
							position: 'fixed',
							top: coords.top,
							left: coords.left,
							zIndex: 99999,
							pointerEvents: 'none',
						}}
					>
						{content}
					</div>,
					document.body
				)}
			</>
		);
	}
);

Tooltip.displayName = 'Tooltip';
export default Tooltip;
