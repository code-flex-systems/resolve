'use client';
import { Collapse, Paper, Typography } from '@mui/material';
import ProfileAvatar from '../home/ProfileAvatar';
import Toolbar from './Toolbar';
import { OFFWHITE_COLOR } from '@/styles/theme';
import { useGlobalStore } from '@/stores/useGlobalStore';

export default function SiteHeader() {
	const navOpen = useGlobalStore((state) => state.navOpen);
	return (
		<Paper style={styles.paper} className="flex-row-left">
			<Toolbar
				left={
					<Collapse in={!navOpen} orientation="horizontal">
						<div className="flex-row-left">
							<Typography fontSize={30} marginLeft="5px">
								Manifest
							</Typography>
						</div>
					</Collapse>
				}
				right={<ProfileAvatar />}
				height={60}
				padding="10px 20px 10px 10px"
			/>
		</Paper>
	);
}

const styles = {
	paper: {
		width: '100%',
		height: 60,
		minHeight: 60,
		backgroundColor: OFFWHITE_COLOR,
		zIndex: 10,
		borderRadius: 0,
	},
};
