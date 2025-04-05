import { useState } from 'react';
import { Avatar, Divider, Link, Paper, PopperProps, Typography } from '@mui/material';
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';
import theme from '../../styles/theme';
import BasicPopper from './BasicPopper';

export default function ProfileAvatar() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);

	return (
		<>
			<div
				id="avatar"
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				<Avatar sx={styles.avatar}>OF</Avatar>
			</div>

			<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-end">
				<Paper style={styles.paper}>
					<Typography fontSize={17} fontWeight="bold">
						Owen Farthing
					</Typography>
					<div style={styles.divider}>
						<Divider />
					</div>
					<div style={{ ...styles.row, marginTop: 10 }}>
						<Email sx={styles.icon} />
						<Typography fontSize={15}>owenfarthing@gmail.com</Typography>
					</div>
					<div style={{ ...styles.row, marginTop: 5 }}>
						<Phone sx={styles.icon} />
						<Typography fontSize={15}>(1) 123-456-7890</Typography>
					</div>
					<div style={{ ...styles.divider, marginTop: 10 }}>
						<Divider />
					</div>
					<div style={{ ...styles.row, justifyContent: 'flex-end', marginTop: 5 }}>
						<Link fontSize={15}>Sign Out</Link>
					</div>
				</Paper>
			</BasicPopper>
		</>
	);
}

const styles = {
	avatar: {
		width: 35,
		height: 35,
		fontSize: 15,
		bgcolor: 'primary.main',
		cursor: 'pointer',
	},
	divider: {
		width: '100%',
		height: 1,
	},
	icon: {
		fontSize: 15,
		marginRight: '10px',
	},
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
	row: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
};
