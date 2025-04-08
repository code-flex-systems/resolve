import { Info } from '@mui/icons-material';
import './styles.css';
import BasicPopper from '../common/BasicPopper';
import { Fade, Paper, Popper, PopperProps, Typography } from '@mui/material';
import { useRef, useState } from 'react';
import theme from '../../styles/theme';

export default function QuestionInfo(props: { description: string | null; filename: string | null }) {
	const ref = useRef(null);

	return (
		<>
			<Info ref={ref} sx={{ color: 'info.main', marginLeft: '5px' }} className="info" />

			<Popper
				open={true}
				anchorEl={ref.current}
				placement="right"
				className="popper"
				style={{ zIndex: 100 }}
				transition
			>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper style={styles.paper}>
								<Typography fontSize={17} fontWeight="bold">
									{props.description}
								</Typography>
							</Paper>
						</span>
					</Fade>
				)}
			</Popper>
		</>
	);
}

const styles = {
	paper: {
		width: 250,
		height: 'fit-content',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		outline: `1px solid ${theme.palette.primary.light}`,
		padding: 10,
		marginTop: 5,
	},
};
