import theme from '@/styles/theme';
import { Box, Divider, Fade, Paper, Popper, PopperProps, Stack, Typography } from '@mui/material';
import Adjust from '@mui/icons-material/Adjust';
import CheckCircle from '@mui/icons-material/CheckCircle';
import PanoramaFishEye from '@mui/icons-material/PanoramaFishEye';
import Error from '@mui/icons-material/Error';
import Info from '@mui/icons-material/Info';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useState } from 'react';

export default function Legend() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	return (
		<>
			<BasicButtonStyled
				buttonProps={{
					onMouseEnter: (e) => setAnchorEl(e.currentTarget),
					onMouseLeave: () => setAnchorEl(null),
				}}
				icon={<Info />}
				compact
			/>
			<Popper open={!!anchorEl} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 100 }} transition>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper sx={styles.container} className="flex-col-start">
								<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
									<Typography marginBottom="5px">Legend</Typography>
									<Divider flexItem />
									<Box display="flex" alignItems="center" padding="2px" marginTop="10px">
										<PanoramaFishEye sx={styles.icon} />
										<Typography fontSize={14}>The page hasn't been started yet</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<Adjust sx={styles.icon} />
										<Typography fontSize={14}>The page is partially complete</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<CheckCircle sx={styles.icon} />
										<Typography fontSize={14}>The page is complete</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<Error sx={styles.icon} />
										<Typography fontSize={14}>The page has been changed</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="5px 2px 2px">
										<Typography fontSize={14} color="error.light">
											Unanswered questions show in red
										</Typography>
									</Box>
								</Stack>
							</Paper>
						</span>
					</Fade>
				)}
			</Popper>
		</>
	);
}

const styles = {
	container: {
		width: 'fit-content',
		p: '10px 20px',
		height: 'fit-content',
		mt: 0.625,
	},
	icon: {
		color: theme.palette.primary.main,
		mr: 1.25,
	},
};
