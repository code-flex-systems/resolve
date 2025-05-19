'use client';
import { Dialog, DialogActions } from '@mui/material';
import { PropsWithChildren } from 'react';
import BasicButton from './BasicButton';
import theme from '@/styles/theme';

export default function ConfirmationDialog(
	props: {
		onConfirm: () => void;
		onClose: () => void;
		negative?: boolean;
	} & PropsWithChildren
) {
	const { onConfirm, onClose, negative = false } = props;
	return (
		<Dialog
			open={true}
			onClose={onClose}
			sx={{
				'& .MuiPaper-root': {
					maxWidth: '100%',
					outline: `1px solid ${theme.palette.primary.main}`,
					padding: '20px 20px 10px',
				},
			}}
		>
			<div style={styles.container}>{props.children}</div>

			<DialogActions style={{ justifyContent: 'center' }}>
				<BasicButton
					buttonProps={{
						onClick: onClose,
						variant: 'outlined',
						color: 'primary',
						sx: styles.button,
					}}
				>
					Cancel
				</BasicButton>
				<BasicButton
					buttonProps={{
						onClick: onConfirm,
						variant: 'outlined',
						color: negative ? 'warning' : undefined,
						sx: styles.button,
					}}
				>
					OK
				</BasicButton>
			</DialogActions>
		</Dialog>
	);
}

const styles = {
	button: {
		fontSize: 13,
	},
	container: {
		width: '100%',
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		padding: '10px 0px',
	},
};
