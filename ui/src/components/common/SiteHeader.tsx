import { Collapse, Paper, Typography } from '@mui/material';
import config from '../../config/config';
import ProfileAvatar from './ProfileAvatar';
import Toolbar from './Toolbar';
import theme, { BACKDROP_COLOR, OFFWHITE_COLOR } from '../../styles/theme';
import { useGlobalSlice } from '../../state/store';
import logo from '../../resources/images/logo-green.png';

export default function SiteHeader() {
	const navOpen = useGlobalSlice((state) => state.navOpen);
	return (
		<Paper style={styles.paper}>
			<Toolbar
				left={
					<Typography color="primary" fontSize={25} fontWeight="bold">
						Manifest
					</Typography>
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
	},
};
