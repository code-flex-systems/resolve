'use client';

import { PropsWithChildren } from 'react';
import { Box } from '@mui/material';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import NewUserDialog from '@/components/admin/NewUserDialog';
import { useAdminStore } from '@/stores/useAdminStore';
import { useEffect } from 'react';

// Icons
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import CloudSyncIcon from '@mui/icons-material/CloudSync';
import BusinessIcon from '@mui/icons-material/Business';
import GroupsIcon from '@mui/icons-material/Groups';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ChecklistIcon from '@mui/icons-material/Checklist';

const adminNavCategories: AdminNavCategory[] = [
	{
		label: 'Overview',
		icon: <DashboardIcon fontSize="small" />,
		items: [
			{
				label: 'Overview',
				route: '/admin/overview/dashboard',
				icon: <DashboardIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
		hideHeader: true,
	},
	{
		label: 'User Management',
		icon: <ManageAccountsIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Users',
				route: '/admin/user-management/users',
				icon: <PeopleIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
	{
		label: 'Data Sources',
		icon: <CloudSyncIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Feeds & Claims',
				route: '/admin/data-sources/feeds-and-claims',
				icon: <ContentPasteSearchIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
	{
		label: 'Workflow Configuration',
		icon: <PlaylistAddCheckIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Checklists',
				route: '/admin/workflow-configuration/checklists',
				icon: <ChecklistIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
	{
		label: 'Party Management',
		icon: <BusinessIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Parties',
				route: '/admin/party-management/parties',
				icon: <BusinessIcon fontSize="small" />,
			},
			{
				label: 'Offices',
				route: '/admin/party-management/offices',
				icon: <LocationOnIcon fontSize="small" />,
			},
			{
				label: 'Representatives',
				route: '/admin/party-management/representatives',
				icon: <PersonIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
	// {
	// 	label: 'Financial',
	// 	icon: <AttachMoneyIcon fontSize="small" />,
	// 	items: [],
	// 	defaultExpanded: false,
	// },
	// {
	// 	label: 'Litigation',
	// 	icon: <GavelIcon fontSize="small" />,
	// 	items: [],
	// 	defaultExpanded: false,
	// },
	{
		label: 'Documents',
		icon: <FolderIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Documents',
				route: '/admin/documents/documents',
				icon: <DescriptionIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
	// {
	// 	label: 'Automation',
	// 	icon: <SmartToyIcon fontSize="small" />,
	// 	items: [],
	// 	defaultExpanded: false,
	// },
	{
		label: 'System',
		icon: <SettingsIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Settings',
				route: '/admin/system/settings',
				icon: <SettingsIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
	},
];

export default function AdminLayout(props: PropsWithChildren) {
	const showNewUserDialog = useAdminStore((state) => state.showNewUserDialog);
	const resetAdminStore = useAdminStore((state) => state.reset);

	useEffect(() => {
		return () => resetAdminStore();
	}, [resetAdminStore]);

	return (
		<PageWrapper>
			<Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
				<AdminSidebar categories={adminNavCategories} />
				<Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>{props.children}</Box>
			</Box>
			{showNewUserDialog && <NewUserDialog />}
		</PageWrapper>
	);
}
