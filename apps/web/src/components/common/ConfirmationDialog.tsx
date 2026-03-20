'use client';

import { PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import css from './ConfirmationDialog.module.css';

export default function ConfirmationDialog(
	props: {
		onConfirm: () => void;
		onClose: () => void;
		negative?: boolean;
	} & PropsWithChildren
) {
	const { onConfirm, onClose, negative = false } = props;
	const dialogRef = useRef<HTMLDialogElement>(null);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (dialog && !dialog.open) {
			dialog.showModal();
		}
	}, []);

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		const handleClose = () => onClose();
		dialog.addEventListener('close', handleClose);
		return () => dialog.removeEventListener('close', handleClose);
	}, [onClose]);

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLDialogElement>) => {
			if (e.target === e.currentTarget) onClose();
		},
		[onClose]
	);

	return (
		<dialog ref={dialogRef} className={css.dialog} onClick={handleClick}>
			<div className={css.inner}>
				<div className={css.container}>{props.children}</div>
				<div className={css.actions}>
					<Button variant="outlined" onClick={onClose} size="sm">
						Cancel
					</Button>
					<Button
						variant="outlined"
						color={negative ? 'warning' : 'primary'}
						onClick={onConfirm}
						size="sm"
					>
						OK
					</Button>
				</div>
			</div>
		</dialog>
	);
}
