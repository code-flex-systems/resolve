'use client';

import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Popper.module.css';

export interface PopperProps {
	open: boolean;
	onClose: () => void;
	anchorRef: React.RefObject<HTMLElement | null>;
	placement?: 'top' | 'bottom' | 'left' | 'right' | 'bottom-start' | 'bottom-end';
	children: ReactNode;
	className?: string;
}

function Popper({
	open,
	onClose,
	anchorRef,
	placement = 'bottom',
	children,
	className,
}: PopperProps) {
	const popperRef = useRef<HTMLDivElement>(null);
	const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
	const [visible, setVisible] = useState(false);

	const updatePosition = useCallback(() => {
		const anchor = anchorRef.current;
		const popper = popperRef.current;
		if (!anchor || !popper) return;

		const rect = anchor.getBoundingClientRect();
		const popperRect = popper.getBoundingClientRect();
		let top = 0;
		let left = 0;

		switch (placement) {
			case 'top':
				top = rect.top - popperRect.height - 4;
				left = rect.left + rect.width / 2 - popperRect.width / 2;
				break;
			case 'bottom':
				top = rect.bottom + 4;
				left = rect.left + rect.width / 2 - popperRect.width / 2;
				break;
			case 'bottom-start':
				top = rect.bottom + 4;
				left = rect.left;
				break;
			case 'bottom-end':
				top = rect.bottom + 4;
				left = rect.right - popperRect.width;
				break;
			case 'left':
				top = rect.top + rect.height / 2 - popperRect.height / 2;
				left = rect.left - popperRect.width - 4;
				break;
			case 'right':
				top = rect.top + rect.height / 2 - popperRect.height / 2;
				left = rect.right + 4;
				break;
		}

		setPosition({ top: top + window.scrollY, left: left + window.scrollX });
	}, [anchorRef, placement]);

	// Position and show
	useEffect(() => {
		if (!open) {
			setVisible(false);
			return;
		}

		// Wait one frame for the portal to render, then position
		const frame = requestAnimationFrame(() => {
			updatePosition();
			setVisible(true);
		});

		return () => cancelAnimationFrame(frame);
	}, [open, updatePosition]);

	// Reposition on scroll/resize
	useEffect(() => {
		if (!open) return;

		const handleReposition = () => updatePosition();
		window.addEventListener('scroll', handleReposition, true);
		window.addEventListener('resize', handleReposition);

		return () => {
			window.removeEventListener('scroll', handleReposition, true);
			window.removeEventListener('resize', handleReposition);
		};
	}, [open, updatePosition]);

	// Click-away
	useEffect(() => {
		if (!open) return;

		const handleMouseDown = (e: MouseEvent) => {
			const target = e.target as Element | null;
			// Ignore clicks inside portaled listboxes/menus opened from within the popper
			// (Combobox, Dropdown, etc. render their menus to document.body, so they aren't
			// DOM descendants of the popper but should be treated as part of it.)
			if (target?.closest('[role="listbox"], [role="menu"]')) return;
			if (
				popperRef.current &&
				!popperRef.current.contains(e.target as Node) &&
				anchorRef.current &&
				!anchorRef.current.contains(e.target as Node)
			) {
				onClose();
			}
		};

		document.addEventListener('mousedown', handleMouseDown);
		return () => document.removeEventListener('mousedown', handleMouseDown);
	}, [open, onClose, anchorRef]);

	// Escape key
	useEffect(() => {
		if (!open) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};

		document.addEventListener('keydown', handleKeyDown);
		return () => document.removeEventListener('keydown', handleKeyDown);
	}, [open, onClose]);

	if (!open) return null;

	const classNames = [styles.popper, visible && styles.visible, className]
		.filter(Boolean)
		.join(' ');

	return createPortal(
		<div
			ref={popperRef}
			className={classNames}
			style={{ top: position.top, left: position.left }}
		>
			{children}
		</div>,
		document.body
	);
}

Popper.displayName = 'Popper';
export default Popper;
