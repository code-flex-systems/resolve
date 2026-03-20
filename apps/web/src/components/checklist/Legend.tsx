import { Box, Paper, Popper, PopperProps, Stack, Typography , Fade } from '@mui/material';
import BasicButtonStyled from '../common/BasicButtonStyled';
import { useState } from 'react';
import { IconAdjustments, IconAlertCircle, IconCircle, IconCircleCheck, IconInfoCircle } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

export default function Legend() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	return (
		<>
			<BasicButtonStyled
				buttonProps={{
					onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => setAnchorEl(e.currentTarget),
					onMouseLeave: () => setAnchorEl(null),
				}}
				icon={<IconInfoCircle size={20} />}
				compact
			/>
			<Popper open={!!anchorEl} anchorEl={anchorEl} placement="bottom-start" sx={{ zIndex: 100 }} transition>
				{({ TransitionProps }) => (
					<Fade {...TransitionProps} timeout={350}>
						<span>
							<Paper sx={styles.container} className="flex-col-start">
								<Stack width="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
									<Typography marginBottom="5px">Legend</Typography>
									<Divider />
									<Box display="flex" alignItems="center" padding="2px" marginTop="10px">
										<IconCircle style={styles.icon} />
										<Typography fontSize={14}>The page hasn't been started yet</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<IconAdjustments style={styles.icon} />
										<Typography fontSize={14}>The page is partially complete</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<IconCircleCheck style={styles.icon} />
										<Typography fontSize={14}>The page is complete</Typography>
									</Box>
									<Box display="flex" alignItems="center" padding="2px">
										<IconAlertCircle style={styles.icon} />
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
		color: 'var(--text-accent)',
		mr: 1.25,
	},
};
