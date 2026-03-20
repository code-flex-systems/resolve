'use client';
import { useState } from 'react';
import { Avatar, Paper, PopperProps } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import BasicPopper from '../common/BasicPopper';
import { useClerk } from '@clerk/nextjs';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { getInitials } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import BasicButtonStyled from '../common/BasicButtonStyled';
import UpdateUserDialog from './UpdateUserDialog';
import RoleValue from '../admin/RoleValue';
import { Role } from '@/types/types';
import { IconEdit, IconLogout, IconMail, IconPhone } from '@tabler/icons-react';
import Divider from '@/components/ui/Divider';

export default function ProfileAvatar() {
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const { data: session } = useClerkSession();
	const { signOut } = useClerk();

	return (
		<>
			<div
id="avatar"
				onClick={(e) => {
					setAnchorEl(e.currentTarget);
					e.preventDefault();
					e.stopPropagation();
				}}>
				<Avatar sx={styles.avatar}>{getInitials(session?.user?.name)}</Avatar>
			</div>
			{!!anchorEl && (
				<BasicPopper anchorEl={anchorEl} setAnchorEl={setAnchorEl} placement="bottom-end">
					<Paper elevation={3} sx={styles.paper}>
						<div
style={{
								...styles.row,
								justifyContent: 'space-between',
								overflow: 'hidden' as const,
								margin: '5px 0px 10px',
							}}>
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden' as const, textOverflow: 'ellipsis' }, fontSize: 17, fontWeight: 'bold' }}>
								{session?.user?.name ?? ''}
							</span>
							{!!session?.user && <RoleValue role={session.user.role as Role} />}
						</div>
						<div style={styles.divider}>
							<Divider />
						</div>
						<div style={{ ...styles.row, overflow: 'hidden' as const, marginTop: 5 }}>
							<IconMail style={styles.icon} />
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden' as const, textOverflow: 'ellipsis' }, fontSize: 15, color: BASE_COLOR_LIGHT }}>
								{session?.user?.email ?? ''}
							</span>
						</div>
						<div style={{ ...styles.row, overflow: 'hidden' as const, marginTop: 5 }}>
							<IconPhone style={styles.icon} />
							<span style={{ ...{ whiteSpace: 'nowrap', overflow: 'hidden' as const, textOverflow: 'ellipsis' }, fontSize: 15, color: BASE_COLOR_LIGHT }}>
								{parsePhoneNumberFromString(session?.user?.phone ?? '')?.formatNational()}
							</span>
						</div>
						<div style={{ ...styles.row, justifyContent: 'flex-end', marginTop: 5 }}>
							<div style={{ marginRight: '10px' }}>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => {
											setDialogOpen(true);
											setAnchorEl(null);
										},
									}}
									tooltipProps={{ title: 'Update my info' }}
									icon={<IconEdit size={20} />}
								/>
							</div>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => signOut({ redirectUrl: '/login' }),
								}}
								tooltipProps={{ title: 'Sign out' }}
								icon={<IconLogout size={20} />}
							/>
						</div>
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
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
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
