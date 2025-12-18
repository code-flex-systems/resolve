'use client';
import { JSX } from 'react';
import { Fade, Paper, Typography } from '@mui/material';
import Clear from '@mui/icons-material/Clear';

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
				sx={{
					position: 'fixed',
					zIndex: 100,
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'center',
					alignItems: 'center',
					borderColor: 'primary.main',
					p: '5px 20px 20px',
					width,
					height,
					left: `calc(50vw - ${width / 2}px)`,
					top: `calc(50vh - ${height / 2}px)`,
				}}
			>
				<Toolbar
					left={title ? <Typography fontWeight={500} fontSize={13}>{title}</Typography> : undefined}
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
				<Typography fontStyle="italic" fontSize={13}>{message}</Typography>
			</Paper>
		</Fade>
	);
}
