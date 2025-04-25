import Clear from '@mui/icons-material/Clear';
import { Dialog, DialogActions, DialogContent, Fade, IconButton, Typography } from '@mui/material';
import { PropsWithChildren } from 'react';
import BasicButton from './BasicButton';
import { DialogAction } from '../../types';

export default function BasicDialog(
	props: {
		title?: string;
		onClose: () => void;
		closeDisabled?: boolean;
		primaryAction?: DialogAction;
		secondaryActions?: DialogAction[];
		width?: number | string;
		height?: number | string;
		maxHeight?: number | string;
	} & PropsWithChildren
) {
	const {
		title,
		onClose,
		closeDisabled,
		primaryAction,
		secondaryActions = [],
		width = 'fit-content',
		height = 'fit-content',
		maxHeight,
	} = props;
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
				<div style={{ ...styles.titleSide, justifyContent: 'flex-start' }}>
					{title && (
						<div style={styles.titleCard}>
							<Typography fontSize={17} lineHeight="21px">
								{title}
							</Typography>
						</div>
					)}
				</div>
				<div style={{ ...styles.titleSide, width: '10%', justifyContent: 'flex-end' }}>
					<IconButton onClick={onClose} disabled={closeDisabled}>
						<Clear />
					</IconButton>
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
		width: '90%',
		display: 'flex',
		alignItems: 'center',
	},
	titleCard: {
		backgroundColor: '#e8e8f3',
		padding: 5,
	},
};
