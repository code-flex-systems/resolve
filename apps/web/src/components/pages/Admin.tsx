import { useAdminSlice } from '@/state/store';
import NewUserDialog from '../admin/NewUserDialog';
import PageWrapper from '../common/PageWrapper';
import { Box, Tab, Tabs } from '@mui/material';
import { setTab } from '@/state/admin/actions';
import UsersTab from '../admin/UsersTab';

export default function Admin() {
	const selectedTab = useAdminSlice((state) => state.selectedTab);
	const showNewUserDialog = useAdminSlice((state) => state.showNewUserDialog);

	return (
		<PageWrapper route="checklist">
			<div style={styles.container}>
				<Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
					<Tabs value={selectedTab} onChange={(_, newTab) => setTab(newTab)}>
						<Tab label="Users" id="users" value={1} disableRipple />
						<Tab label="Checklists" id="checklists" value={2} disableRipple />
						<Tab label="Settings" id="settings" value={3} disableRipple />
					</Tabs>
				</Box>
				{selectedTab === 1 && <UsersTab />}
				{showNewUserDialog && <NewUserDialog />}
			</div>
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'center',
		padding: 20,
	},
};
