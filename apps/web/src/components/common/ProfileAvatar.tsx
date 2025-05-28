'use client';
import { useState } from 'react';
import { Avatar, Divider, Link, Paper, PopperProps, Typography } from '@mui/material';
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';
import theme, { BASE_COLOR } from '@/styles/theme';
import BasicPopper from './BasicPopper';
import { signOut, useSession } from 'next-auth/react';
import { getInitials } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';

export default function ProfileAvatar() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const { data: session } = useSession();

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
				<Avatar sx={styles.avatar}>{getInitials(session?.user?.name)}</Avatar>
			</div>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-end">
					<Paper style={styles.paper}>
						<Typography fontSize={17} fontWeight="bold">
							{session?.user?.name ?? ''}
						</Typography>
						<div style={styles.divider}>
							<Divider />
						</div>
						<div style={{ ...styles.row, marginTop: 10 }}>
							<Email sx={styles.icon} />
							<Typography fontSize={15}>{session?.user?.email ?? ''}</Typography>
						</div>
						<div style={{ ...styles.row, marginTop: 5 }}>
							<Phone sx={styles.icon} />
							<Typography fontSize={15}>
								{parsePhoneNumberFromString(session?.user?.phone ?? '')?.formatNational()}
							</Typography>
						</div>
						<div style={{ ...styles.divider, marginTop: 10 }}>
							<Divider />
						</div>
						<div style={{ ...styles.row, justifyContent: 'flex-end', marginTop: 5 }}>
							<Link onClick={() => signOut({ callbackUrl: '/login' })} fontSize={15}>
								Sign Out
							</Link>
						</div>
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	avatar: {
		width: 35,
		height: 35,
		fontSize: 15,
		bgcolor: BASE_COLOR,
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
