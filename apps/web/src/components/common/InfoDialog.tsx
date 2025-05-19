'use client';
import { JSX } from 'react';
import { Fade, Paper, Typography } from '@mui/material';
import Clear from '@mui/icons-material/Clear';

import theme from '@/styles/theme';
import BasicButton from './BasicButton';
import Toolbar from './Toolbar';

export default function InfoDialog(props: {
	open: boolean;
	title?: string;
	message: string | JSX.Element;
	onClose: () => void;
	width: number;
	height: number;
}) {
	const { open, title, message, onClose, width, height } = props;
	return (
		<Fade in={open}>
			<Paper
				elevation={3}
				style={{
					...styles.paper,
					width,
					height,
					left: `calc(50vw - ${width / 2}px)`,
					top: `calc(50vh - ${height / 2}px)`,
				}}
			>
				<Toolbar
					left={title ? <Typography fontWeight="bold">{title}</Typography> : undefined}
					right={
						<BasicButton
							buttonProps={{
								onClick: onClose,
							}}
							icon={<Clear />}
						/>
					}
					padding={0}
				/>
				<Typography fontStyle="italic">{message}</Typography>
			</Paper>
		</Fade>
	);
}

const styles = {
	paper: {
		position: 'fixed' as const,
		zIndex: 100,
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		border: `1px solid ${theme.palette.primary.main}`,
		padding: '5px 20px 20px',
	},
};
