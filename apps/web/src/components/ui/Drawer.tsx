'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import styles from './Drawer.module.css';

export interface DrawerProps {
	open: boolean;
	onClose: () => void;
	anchor?: 'left' | 'right';
	width?: number | string;
	children: ReactNode;
	className?: string;
}

export default function Drawer({
	open,
	onClose,
	anchor = 'right',
	width = 400,
	children,
	className,
}: DrawerProps) {
	// Close on Escape
	useEffect(() => {
		if (!open) return;
		const handleEscape = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', handleEscape);
		return () => document.removeEventListener('keydown', handleEscape);
	}, [open, onClose]);

	// Prevent body scroll when open
	useEffect(() => {
		if (open) {
			document.body.style.overflow = 'hidden';
		} else {
			document.body.style.overflow = '';
		}
		return () => {
			document.body.style.overflow = '';
		};
	}, [open]);

	const handleBackdropClick = useCallback(
		(e: React.MouseEvent) => {
			if (e.target === e.currentTarget) onClose();
		},
		[onClose]
	);

	if (!open) return null;

	const drawerClassNames = [styles.drawer, styles[anchor], styles.open, className]
		.filter(Boolean)
		.join(' ');

	return createPortal(
		<div className={styles.backdrop} onClick={handleBackdropClick}>
			<div className={drawerClassNames} style={{ width }}>
				{children}
			</div>
		</div>,
		document.body
	);
}
