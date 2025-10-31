'use client';

import NewUserDialog from '../admin/NewUserDialog';
import { Box, Tab, Tabs } from '@mui/material';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo } from 'react';
import { useAdminStore } from '@/stores/useAdminStore';

const tabs = ['dashboard', 'users', 'checklists', 'feeds-and-claims', 'documents', 'settings'];

export default function AdminTabs() {
	const showNewUserDialog = useAdminStore((state) => state.showNewUserDialog);
	const resetAdminStore = useAdminStore((state) => state.reset);
	const router = useRouter();
	const pathname = usePathname();
	const currentTab = useMemo(() => {
		const tabIndex = tabs.findIndex((tab) => pathname.endsWith(tab));
		return tabIndex === -1 ? 0 : tabIndex;
	}, [pathname]);

	const setTab = (_: any, newValue: number) => {
		router.push(`/admin/${tabs[newValue]}`);
	};

	useEffect(() => {
		return () => resetAdminStore();
	}, []);

	return (
		<>
			<Box sx={{ borderBottom: 1, borderColor: 'divider', width: '100%' }}>
				<Tabs value={currentTab} onChange={setTab}>
					<Tab label="Dashboard" id="dashboard" value={0} disableRipple />
					<Tab label="Users" id="users" value={1} disableRipple />
					<Tab label="Checklists" id="checklists" value={2} disableRipple />
					<Tab label="Feeds & Claims" id="feeds-claims" value={3} disableRipple />
					<Tab label="Documents" id="documents" value={4} disableRipple />
					<Tab label="Settings" id="settings" value={5} disableRipple />
				</Tabs>
			</Box>
			{showNewUserDialog && <NewUserDialog />}
		</>
	);
}
