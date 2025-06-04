'use client';

import { useAdminSlice } from '@/state/store';
import NewUserDialog from '../admin/NewUserDialog';
import { Box, Tab, Tabs } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useMemo } from 'react';

const tabs = ['users', 'checklists', 'feeds-and-claims', 'settings'];

export default function AdminTabs() {
	const showNewUserDialog = useAdminSlice((state) => state.showNewUserDialog);
	const router = useRouter();
	const pathname = usePathname();
	const currentTab = useMemo(() => tabs.findIndex((tab) => pathname.endsWith(tab)), [pathname]);

	const setTab = (_: any, newValue: number) => {
		router.push(`/admin/${tabs[newValue]}`);
	};

	return (
		<>
			<Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
				<Tabs value={currentTab} onChange={setTab}>
					<Tab label="Users" id="users" value={0} disableRipple />
					<Tab label="Checklists" id="checklists" value={1} disableRipple />
					<Tab label="Feeds & Claims" id="feeds-claims" value={2} disableRipple />
					<Tab label="Settings" id="settings" value={3} disableRipple />
				</Tabs>
			</Box>
			{showNewUserDialog && <NewUserDialog />}
		</>
	);
}
