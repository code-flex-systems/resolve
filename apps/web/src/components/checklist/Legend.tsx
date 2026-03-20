import { Paper, Popper, PopperProps, Fade } from '@mui/material';
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
								<div     style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-start' }}>
									<span  style={{ marginBottom: '5px' }}>Legend</span>
									<Divider />
									<div     style={{ display: 'flex', alignItems: 'center', padding: '2px', marginTop: '10px' }}>
										<IconCircle style={styles.icon} />
										<span  style={{ fontSize: 14 }}>The page hasn't been started yet</span>
									</div>
									<div    style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
										<IconAdjustments style={styles.icon} />
										<span  style={{ fontSize: 14 }}>The page is partially complete</span>
									</div>
									<div    style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
										<IconCircleCheck style={styles.icon} />
										<span  style={{ fontSize: 14 }}>The page is complete</span>
									</div>
									<div    style={{ display: 'flex', alignItems: 'center', padding: '2px' }}>
										<IconAlertCircle style={styles.icon} />
										<span  style={{ fontSize: 14 }}>The page has been changed</span>
									</div>
									<div    style={{ display: 'flex', alignItems: 'center', padding: '5px 2px 2px' }}>
										<span   style={{ fontSize: 14, color: 'error.light' }}>
											Unanswered questions show in red
										</span>
									</div>
								</div>
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
