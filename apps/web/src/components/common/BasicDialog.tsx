'use client';
import { Dialog, DialogActions, DialogContent, Fade, IconButton, Paper, Typography } from '@mui/material';
import { JSX, PropsWithChildren } from 'react';
import BasicButton from './BasicButton';
import { DialogAction } from '@/types/types';
import { Cancel } from '@mui/icons-material';

export default function BasicDialog(
	props: {
		title?: string | JSX.Element;
		onClose: () => void;
		closeDisabled?: boolean;
		primaryAction?: DialogAction;
		secondaryActions?: DialogAction[];
		iconActions?: JSX.Element[];
		width?: number | string;
		height?: number | string;
		maxHeight?: number | string;
		showCloseButton?: boolean;
	} & PropsWithChildren
) {
	const {
		title,
		onClose,
		closeDisabled,
		primaryAction,
		secondaryActions = [],
		iconActions = [],
		width = 'fit-content',
		height = 'fit-content',
		maxHeight,
		showCloseButton = true,
	} = props;
	const iconActionsPercentage = 10 * (iconActions.length + 1);
	return (
		<Dialog
			open={true}
			onClose={closeDisabled ? undefined : onClose}
			sx={{
				'& .MuiPaper-root': {
					maxWidth: '100%',
					width: width,
					height: height,
					maxHeight,
				},
			}}
		>
			<div style={styles.title}>
				<div
					style={{
						...styles.titleSide,
						width: `${100 - iconActionsPercentage}%`,
						justifyContent: 'flex-start',
					}}
				>
					{typeof title === 'string' ? (
						<Paper elevation={0} style={styles.titleCard}>
							<Typography fontSize={17} lineHeight="21px">
								{title}
							</Typography>
						</Paper>
					) : (
						<>{title ?? <></>}</>
					)}
				</div>
				<div style={{ ...styles.titleSide, width: `${iconActionsPercentage}%`, justifyContent: 'flex-end' }}>
					{...iconActions}
					{showCloseButton && (
						<IconButton onClick={onClose} disabled={closeDisabled}>
							<Cancel sx={{ fontSize: 21 }} />
						</IconButton>
					)}
				</div>
			</div>

			<DialogContent style={{ overflow: 'auto', height: 'calc(100% - 90px)' }}>{props.children}</DialogContent>

			{(primaryAction || secondaryActions.length > 0) && (
				<DialogActions>
					{secondaryActions.reverse().map((action, i) => (
						<Fade key={i} in={action.hidden === undefined ? true : !action.hidden}>
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
										startIcon: primaryAction.icon,
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

const styles = {
	title: {
		width: '100%',
		height: 50,
		minHeight: 50,
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: '0px 10px',
	},
	titleSide: {
		display: 'flex',
		alignItems: 'center',
	},
	titleCard: {
		backgroundColor: '#e8e8f3',
		padding: 5,
		width: 'fit-content',
		height: 'fit-content',
	},
};
