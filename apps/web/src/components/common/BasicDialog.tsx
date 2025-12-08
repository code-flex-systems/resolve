'use client';
import { Box, Dialog, DialogActions, DialogContent, Fade, IconButton, Paper, Typography } from '@mui/material';
import { JSX, PropsWithChildren } from 'react';
import BasicButton from './BasicButton';
import { DialogAction } from '@/types/types';
import Cancel from '@mui/icons-material/Cancel';
import CheckCircle from '@mui/icons-material/CheckCircle';

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
		width = 'fit-content',
		height = 'fit-content',
		maxHeight,
		showCloseButton = true,
		showOverflow = false,
	} = props;
	const iconActionsPercentage = 10 * (iconActions.length + 1);
	return (
		<Dialog
			open={true}
			onClose={closeDisabled ? undefined : onClose}
			sx={{
				overflow: showOverflow ? 'visible' : undefined,
				'& .MuiPaper-root': {
					maxWidth: '100%',
					width: width,
					height: height,
					maxHeight,
				},
			}}
		>
			{(!!title || !!iconActions.length || showCloseButton) && (
				<Box
					sx={{
						width: '100%',
						height: titleHeight,
						display: 'flex',
						justifyContent: 'space-between',
						alignItems: 'center',
						px: 2,
						flexShrink: 0,
					}}
				>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							flex: 1,
							minWidth: 0,
							overflow: 'hidden',
							justifyContent: 'flex-start',
						}}
					>
						{typeof title === 'string' ? (
							<Paper
								elevation={0}
								sx={{
									bgcolor: 'var(--color-bg-tertiary)',
									py: 0.5,
									px: 1,
									maxWidth: '100%',
								}}
							>
								<Typography fontSize={15} lineHeight={1.25} noWrap>
									{title}
								</Typography>
							</Paper>
						) : (
							<>{title ?? <></>}</>
						)}
					</Box>
					<Box
						sx={{
							display: 'flex',
							alignItems: 'center',
							justifyContent: 'flex-end',
							flexShrink: 0,
							gap: 0.5,
						}}
					>
						{...iconActions}
						{showCloseButton && (
							<IconButton onClick={onClose} disabled={closeDisabled}>
								<Cancel sx={{ fontSize: 19 }} />
							</IconButton>
						)}
					</Box>
				</Box>
			)}

			<DialogContent sx={{ overflow: showOverflow ? 'visible' : 'auto', height: 'calc(100% - 90px)' }}>
				{props.children}
			</DialogContent>

			{(primaryAction || secondaryActions.length > 0) && (
				<DialogActions>
					{secondaryActions.reverse().map((action) => (
						<Fade key={action.label} in={action.hidden === undefined ? true : !action.hidden}>
							<span>
								<BasicButton
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
							</span>
						</Fade>
					))}

					{primaryAction && (
						<Fade key="primary" in={primaryAction.hidden === undefined ? true : !primaryAction.hidden}>
							<span>
								<BasicButton
									buttonProps={{
										onClick: primaryAction.onClick,
										variant: 'contained',
										disabled: primaryAction.disabled,
										color: primaryAction.color,
										startIcon: primaryAction.icon ?? <CheckCircle />,
									}}
								>
									{primaryAction.label}
								</BasicButton>
							</span>
						</Fade>
					)}
				</DialogActions>
			)}
		</Dialog>
	);
}
