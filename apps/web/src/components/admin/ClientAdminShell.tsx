'use client';

import { PropsWithChildren, useEffect } from 'react';
import { Box } from '@mui/material';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import NewUserDialog from '@/components/admin/NewUserDialog';
import { useAdminStore } from '@/stores/useAdminStore';
import config from '@/config/config';

// Icons
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import CurrencyExchangeIcon from '@mui/icons-material/CurrencyExchange';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';
import FolderIcon from '@mui/icons-material/Folder';
import SettingsIcon from '@mui/icons-material/Settings';
import DescriptionIcon from '@mui/icons-material/Description';
import ContentPasteSearchIcon from '@mui/icons-material/ContentPasteSearch';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import ChecklistIcon from '@mui/icons-material/Checklist';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import DeskIcon from '@mui/icons-material/Desk';
import AssignmentIcon from '@mui/icons-material/Assignment';
import TaskIcon from '@mui/icons-material/Task';
import ListIcon from '@mui/icons-material/List';
import GavelIcon from '@mui/icons-material/Gavel';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';

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
		defaultExpanded: false,
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
			{
				label: 'Activity',
				route: '/admin/user-management/activity',
				icon: <GraphicEqIcon fontSize="small" />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Claim Management',
		icon: <ContentPasteSearchIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'All Claims',
				route: '/admin/claims',
				icon: <ContentPasteSearchIcon fontSize="small" />,
			},
			{
				label: 'Feeds',
				route: '/admin/claims/feeds',
				icon: <RssFeedIcon fontSize="small" />,
			},
		],
		defaultExpanded: false,
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
			...(config.FEATURES.DESK_HIERARCHY
				? [
						{
							label: 'Desk Locations',
							route: '/admin/workflow-configuration/desk-locations',
							icon: <DeskIcon fontSize="small" />,
						},
						{
							label: 'Desk Assignments',
							route: '/admin/workflow-configuration/desk-assignments',
							icon: <AssignmentIcon fontSize="small" />,
						},
						{
							label: 'Tasks',
							route: '/admin/workflow-configuration/tasks',
							icon: <TaskIcon fontSize="small" />,
						},
					]
				: []),
		],
		defaultExpanded: false,
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
				label: 'Addresses',
				route: '/admin/party-management/addresses',
				icon: <LocationOnIcon fontSize="small" />,
			},
			{
				label: 'Representatives',
				route: '/admin/party-management/representatives',
				icon: <PersonIcon fontSize="small" />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Financial',
		icon: <AttachMoneyIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Recovery',
				route: '/admin/financial/recovery',
				icon: <CurrencyExchangeIcon fontSize="small" />,
			},
		],
		defaultExpanded: false,
	},
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
		defaultExpanded: false,
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
				label: 'Logs',
				route: '/admin/system/logs',
				icon: <ContentPasteSearchIcon fontSize="small" />,
			},
			{
				label: 'Claim Activity Logs',
				route: '/admin/system/claim-activity-logs',
				icon: <AssignmentTurnedInIcon fontSize="small" />,
			},
			{
				label: 'Reference Data',
				route: '/admin/system/reference-data',
				icon: <ListIcon fontSize="small" />,
			},
			{
				label: 'Statute Rules',
				route: '/admin/system/statute-rules',
				icon: <GavelIcon fontSize="small" />,
			},
			{
				label: 'Settings',
				route: '/admin/system/settings',
				icon: <SettingsIcon fontSize="small" />,
			},
		],
		defaultExpanded: false,
	},
];

export default function ClientAdminShell(props: PropsWithChildren) {
	const showNewUserDialog = useAdminStore((state) => state.showNewUserDialog);
	const resetAdminStore = useAdminStore((state) => state.reset);

	useEffect(() => {
		return () => resetAdminStore();
	}, [resetAdminStore]);

	return (
		<PageWrapper>
			<Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
				<AdminSidebar title="Admin" categories={adminNavCategories} />
				<Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>{props.children}</Box>
			</Box>
			{showNewUserDialog && <NewUserDialog />}
		</PageWrapper>
	);
}
