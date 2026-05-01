'use client';

import { JSX, PropsWithChildren, useCallback, useEffect, useRef } from 'react';
import BasicButton from './BasicButton';
import { DialogAction } from '@/types/types';
import { IconX, IconCircleCheck } from '@tabler/icons-react';
import css from './BasicDialog.module.css';

export default function BasicDialog(
	props: {
		title?: string | JSX.Element;
		titleHeight?: string | number;
		onClose: () => void;
		closeDisabled?: boolean;
		primaryAction?: DialogAction;
		secondaryActions?: DialogAction[];
		iconActions?: JSX.Element[];
		width?: number | string;
		height?: number | string;
		maxHeight?: number | string;
		showCloseButton?: boolean;
		showOverflow?: boolean;
	} & PropsWithChildren
) {
	const {
		title,
		titleHeight = 40,
		onClose,
		closeDisabled,
		primaryAction,
		secondaryActions = [],
		iconActions = [],
		width = 500,
		height,
		maxHeight,
		showCloseButton = true,
		showOverflow = false,
	} = props;

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
		const handleClose = () => {
			if (!closeDisabled) onClose();
		};
		dialog.addEventListener('close', handleClose);
		return () => dialog.removeEventListener('close', handleClose);
	}, [onClose, closeDisabled]);

	const handleClick = useCallback(
		(e: React.MouseEvent<HTMLDialogElement>) => {
			if (e.target === e.currentTarget && !closeDisabled) {
				onClose();
			}
		},
		[onClose, closeDisabled]
	);

	return (
		<dialog ref={dialogRef} className={css.dialog} onClick={handleClick}>
			<div
				className={css.inner}
				style={{
					width: typeof width === 'number' ? `min(${width}px, 90vw)` : width,
					height,
					maxHeight: maxHeight ?? '85vh',
				}}
			>
				{(!!title || !!iconActions.length || showCloseButton) && (
					<div className={css.header} style={{ minHeight: titleHeight }}>
						<div className={css.titleArea}>
							{typeof title === 'string' ? (
								<h6 className={css.title}>{title}</h6>
							) : (
								<>{title ?? <></>}</>
							)}
						</div>
						<div className={css.headerActions}>
							{...iconActions}
							{showCloseButton && (
								<button
									className={css.closeButton}
									onClick={onClose}
									disabled={closeDisabled}
									type="button"
								>
									<IconX size={19} stroke={1.5} />
								</button>
							)}
						</div>
					</div>
				)}
				<div className={css.divider} />

				<div
					className={[css.content, showOverflow ? css.contentOverflow : '']
						.filter(Boolean)
						.join(' ')}
				>
					{props.children}
				</div>

				{(primaryAction || secondaryActions.length > 0) && (
					<>
						<div className={css.divider} />
						<div className={css.actions}>
							{secondaryActions.reverse().map((action) =>
								action.hidden ? null : (
									<BasicButton
										key={action.label}
										buttonProps={{
											onClick: action.onClick,
											variant: 'outlined',
											disabled: action.disabled,
											color: action.color,
											startIcon: action.icon,
										}}
									>
										{action.label}
									</BasicButton>
								)
							)}

							{primaryAction && !primaryAction.hidden && (
								<BasicButton
									key="primary"
									buttonProps={{
										onClick: primaryAction.onClick,
										variant: 'contained',
										disabled: primaryAction.disabled,
										color: primaryAction.color,
										startIcon: primaryAction.icon ?? <IconCircleCheck size={18} />,
									}}
								>
									{primaryAction.label}
								</BasicButton>
							)}
						</div>
					</>
				)}
			</div>
		</dialog>
	);
}
