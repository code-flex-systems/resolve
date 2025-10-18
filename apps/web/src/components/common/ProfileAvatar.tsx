'use client';
import { useState } from 'react';
import { Avatar, Divider, Paper, PopperProps, Typography } from '@mui/material';
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicPopper from './BasicPopper';
import { signOut, useSession } from 'next-auth/react';
import { getInitials } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import BasicButtonStyled from './BasicButtonStyled';
import { Logout } from '@mui/icons-material';

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
					<Paper sx={styles.paper}>
						<div style={{ ...styles.row, overflow: 'hidden', marginTop: 5 }}>
							<Typography fontSize={17} fontWeight="bold" textOverflow="ellipsis" noWrap>
								{session?.user?.name ?? ''}
							</Typography>
						</div>
						<div style={styles.divider}>
							<Divider />
						</div>
						<div style={{ ...styles.row, overflow: 'hidden', marginTop: 5 }}>
							<Email sx={styles.icon} />
							<Typography fontSize={15} color={BASE_COLOR_LIGHT} textOverflow="ellipsis" noWrap>
								{session?.user?.email ?? ''}
							</Typography>
						</div>
						<div style={{ ...styles.row, overflow: 'hidden', marginTop: 5 }}>
							<Phone sx={styles.icon} />
							<Typography fontSize={15} color={BASE_COLOR_LIGHT} textOverflow="ellipsis" noWrap>
								{parsePhoneNumberFromString(session?.user?.phone ?? '')?.formatNational()}
							</Typography>
						</div>
						<div style={{ ...styles.row, justifyContent: 'flex-end', marginTop: 5 }}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => signOut({ callbackUrl: '/login' }),
								}}
								tooltipProps={{ title: 'Sign out' }}
								icon={<Logout />}
							/>
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
		bgcolor: theme.palette.primary.main,
		cursor: 'pointer',
	},
	divider: {
		width: '100%',
		height: 1,
	},
	icon: {
		fontSize: 15,
		marginRight: '10px',
		color: BASE_COLOR_LIGHT,
	},
	paper: {
		width: 350,
		height: 'fit-content',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		outline: `1px solid ${theme.palette.primary.light}`,
		padding: '10px',
		marginTop: '5px',
		borderRadius: 4,
	},
	row: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
};
