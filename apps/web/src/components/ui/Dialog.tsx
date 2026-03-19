'use client';

import { forwardRef, useEffect, useRef, useCallback, type ReactNode } from 'react';
import styles from './Dialog.module.css';

export interface DialogProps {
	open: boolean;
	onClose: () => void;
	title?: string;
	description?: string;
	size?: 'sm' | 'md' | 'lg';
	children: ReactNode;
	footer?: ReactNode;
}

const Dialog = forwardRef<HTMLDialogElement, DialogProps>(
	({ open, onClose, title, description, size = 'md', children, footer }, ref) => {
		const innerRef = useRef<HTMLDialogElement>(null);
		const dialogRef = (ref as React.RefObject<HTMLDialogElement>) || innerRef;

		useEffect(() => {
			const dialog = dialogRef.current;
			if (!dialog) return;

			if (open) {
				if (!dialog.open) {
					dialog.showModal();
				}
			} else {
				if (dialog.open) {
					dialog.close();
				}
			}
		}, [open, dialogRef]);

		// Sync native close event (Escape key) with React state
		useEffect(() => {
			const dialog = dialogRef.current;
			if (!dialog) return;

			const handleClose = () => onClose();
			dialog.addEventListener('close', handleClose);
			return () => dialog.removeEventListener('close', handleClose);
		}, [onClose, dialogRef]);

		// Close on backdrop click — detect clicks on the dialog element itself
		// (the backdrop is part of the dialog element, but outside the inner content)
		const handleClick = useCallback(
			(e: React.MouseEvent<HTMLDialogElement>) => {
				// Only close if the click target is the dialog element itself (the backdrop),
				// not any of its children (the content)
				if (e.target === e.currentTarget) {
					onClose();
				}
			},
			[onClose]
		);

		const classNames = [styles.dialog, styles[size]].filter(Boolean).join(' ');

		// Don't render the dialog element at all when closed.
		// Native <dialog> elements are visible in the document flow when not in modal state,
		// which causes them to appear anchored on the page after closing.
		if (!open) return null;

		return (
			<dialog ref={dialogRef} className={classNames} onClick={handleClick}>
				<div className={styles.inner}>
					{(title || description) && (
						<>
							<div className={styles.header}>
								{title && <h2 className={styles.title}>{title}</h2>}
								{description && <p className={styles.description}>{description}</p>}
							</div>
							<div className={styles.divider} />
						</>
					)}
					<div className={styles.content}>{children}</div>
					{footer && (
						<>
							<div className={styles.divider} />
							<div className={styles.footer}>{footer}</div>
						</>
					)}
				</div>
			</dialog>
		);
	}
);

Dialog.displayName = 'Dialog';
export default Dialog;
