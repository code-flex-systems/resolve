'use client';
import { useState } from 'react';
import { Avatar, Box, Divider, Paper, PopperProps, Typography } from '@mui/material';
import Email from '@mui/icons-material/Email';
import Phone from '@mui/icons-material/Phone';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicPopper from '../common/BasicPopper';
import { useClerk } from '@clerk/nextjs';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { getInitials } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import BasicButtonStyled from '../common/BasicButtonStyled';
import Edit from '@mui/icons-material/Edit';
import Logout from '@mui/icons-material/Logout';
import UpdateUserDialog from './UpdateUserDialog';
import RoleValue from '../admin/RoleValue';
import { Role } from '@/types/types';

export default function ProfileAvatar() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: session } = useClerkSession();
	const { signOut } = useClerk();

	return (
		<>
			<Box
				id="avatar"
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}
			>
				<Avatar sx={styles.avatar}>{getInitials(session?.user?.name)}</Avatar>
			</Box>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-end">
					<Paper elevation={3} sx={styles.paper}>
						<Box
							sx={{
								...styles.row,
								justifyContent: 'space-between',
								overflow: 'hidden',
								m: '5px 0px 10px',
							}}
						>
							<Typography fontSize={17} fontWeight="bold" textOverflow="ellipsis" noWrap>
								{session?.user?.name ?? ''}
							</Typography>
							{!!session?.user && <RoleValue role={session.user.role as Role} />}
						</Box>
						<Box sx={styles.divider}>
							<Divider />
						</Box>
						<Box sx={{ ...styles.row, overflow: 'hidden', mt: 0.625 }}>
							<Email sx={styles.icon} />
							<Typography fontSize={15} color={BASE_COLOR_LIGHT} textOverflow="ellipsis" noWrap>
								{session?.user?.email ?? ''}
							</Typography>
						</Box>
						<Box sx={{ ...styles.row, overflow: 'hidden', mt: 0.625 }}>
							<Phone sx={styles.icon} />
							<Typography fontSize={15} color={BASE_COLOR_LIGHT} textOverflow="ellipsis" noWrap>
								{parsePhoneNumberFromString(session?.user?.phone ?? '')?.formatNational()}
							</Typography>
						</Box>
						<Box sx={{ ...styles.row, justifyContent: 'flex-end', mt: 0.625 }}>
							<Box marginRight="10px">
								<BasicButtonStyled
									buttonProps={{
										onClick: () => {
											setDialogOpen(true);
											setAnchorEl(null);
										},
									}}
									tooltipProps={{ title: 'Update my info' }}
									icon={<Edit />}
								/>
							</Box>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => signOut({ redirectUrl: '/login' }),
								}}
								tooltipProps={{ title: 'Sign out' }}
								icon={<Logout />}
							/>
						</Box>
					</Paper>
				</BasicPopper>
			)}
			{dialogOpen && <UpdateUserDialog onClose={() => setDialogOpen(false)} />}
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
		flexDirection: 'column',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		p: 1.25,
		mt: 0.625,
		borderRadius: 4,
	},
	row: {
		width: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'center',
	},
};
