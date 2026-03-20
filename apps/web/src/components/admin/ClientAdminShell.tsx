'use client';

import { IconBinaryTree, IconBuilding, IconCashBanknote, IconChecklist, IconClipboard, IconClipboardCheck, IconCurrencyDollar, IconDesk, IconFileDescription, IconFileSearch, IconFolder, IconGavel, IconHistory, IconLayoutDashboard, IconList, IconListCheck, IconMapPin, IconRss, IconSettings, IconSubtask, IconTimeline, IconUser, IconUserCog, IconUsers, IconWaveSquare } from '@tabler/icons-react';
import { PropsWithChildren, useEffect } from 'react';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import NewUserDialog from '@/components/admin/NewUserDialog';
import { useAdminStore } from '@/stores/useAdminStore';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import config from '@/config/config';
import { Dialog } from '@mui/material';

// Icons

const adminNavCategories: AdminNavCategory[] = [
	{
		label: 'Overview',
		icon: <IconLayoutDashboard size={20} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/overview/dashboard',
				icon: <IconLayoutDashboard size={20} />,
			},
		],
		defaultExpanded: false,
		hideHeader: true,
	},
	{
		label: 'User Management',
		icon: <IconUserCog fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Users',
				route: '/admin/user-management/users',
				icon: <IconUsers size={20} />,
			},
			{
				label: 'Activity',
				route: '/admin/user-management/activity',
				icon: <IconWaveSquare size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Claim Management',
		icon: <IconFileSearch fontSize="small" color="neutral" />,
		items: [
			{
				label: 'All Claims',
				route: '/admin/claims',
				icon: <IconFileSearch size={20} />,
			},
			{
				label: 'Feeds',
				route: '/admin/claims/feeds',
				icon: <IconRss size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Workflow Configuration',
		icon: <IconListCheck fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Checklists',
				route: '/admin/workflow-configuration/checklists',
				icon: <IconChecklist size={20} />,
			},
			...(config.FEATURES.DESK_HIERARCHY
				? [
						{
							label: 'Workflows',
							route: '/admin/workflow-configuration/workflows',
							icon: <IconBinaryTree size={20} />,
						},
						{
							label: 'Desk Locations',
							route: '/admin/workflow-configuration/desk-locations',
							icon: <IconDesk size={20} />,
						},
						{
							label: 'Desk Assignments',
							route: '/admin/workflow-configuration/desk-assignments',
							icon: <IconClipboard size={20} />,
						},
						{
							label: 'Tasks',
							route: '/admin/workflow-configuration/tasks',
							icon: <IconSubtask size={20} />,
						},
					]
				: []),
		],
		defaultExpanded: false,
	},
	...(config.FEATURES.DESK_HIERARCHY
		? [
				{
					label: 'Workflow Management',
					icon: <IconTimeline fontSize="small" color="neutral" />,
					items: [
						{
							label: 'Dashboard',
							route: '/admin/workflow-management/dashboard',
							icon: <IconTimeline size={20} />,
						},
						{
							label: 'Execution History',
							route: '/admin/workflow-management/execution-history',
							icon: <IconHistory size={20} />,
						},
					],
					defaultExpanded: false,
					hideHeader: false,
				},
			]
		: []),
	{
		label: 'Party Management',
		icon: <IconBuilding fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Parties',
				route: '/admin/party-management/parties',
				icon: <IconBuilding size={20} />,
			},
			{
				label: 'Addresses',
				route: '/admin/party-management/addresses',
				icon: <IconMapPin size={20} />,
			},
			{
				label: 'Representatives',
				route: '/admin/party-management/representatives',
				icon: <IconUser size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Financial',
		icon: <IconCurrencyDollar fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Recovery',
				route: '/admin/financial/recovery',
				icon: <IconCashBanknote size={20} />,
			},
		],
		defaultExpanded: false,
	},
	// {
	// 	label: 'Litigation',
	// 	icon: <IconGavel size={20} />,
	// 	items: [],
	// 	defaultExpanded: false,
	// },
	{
		label: 'Documents',
		icon: <IconFolder fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Documents',
				route: '/admin/documents/documents',
				icon: <IconFileDescription size={20} />,
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
		icon: <IconSettings fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Logs',
				route: '/admin/system/logs',
				icon: <IconFileSearch size={20} />,
			},
			{
				label: 'Claim Activity Logs',
				route: '/admin/system/claim-activity-logs',
				icon: <IconClipboardCheck size={20} />,
			},
			{
				label: 'Reference Data',
				route: '/admin/system/reference-data',
				icon: <IconList size={20} />,
			},
			{
				label: 'Statute Rules',
				route: '/admin/system/statute-rules',
				icon: <IconGavel size={20} />,
			},
			{
				label: 'Settings',
				route: '/admin/system/settings',
				icon: <IconSettings size={20} />,
			},
		],
		defaultExpanded: false,
	},
];

export default function ClientAdminShell(props: PropsWithChildren) {
	const showNewUserDialog = useAdminStore((state) => state.showNewUserDialog);
	const resetAdminStore = useAdminStore((state) => state.reset);
	const deskStore = useDeskLocationStore();
	const { listLocations, listTypes } = useDeskTrpc();

	// Fetch desk locations and types for global store
	const { data: locationsData } = listLocations({});
	const locations = locationsData?.rows || [];
	const { data: typesData } = listTypes({});
	const types = typesData?.rows || [];

	// Populate desk location store (stays fresh with query invalidations)
	useEffect(() => {
		if (locations.length > 0) {
			deskStore.setLocations(locations);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [locations]);

	useEffect(() => {
		if (types.length > 0) {
			deskStore.setTypes(types);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [types]);

	useEffect(() => {
		return () => resetAdminStore();
	}, [resetAdminStore]);

	return (
		<PageWrapper>
			<div style={{ display: 'flex', height: '100%', width: '100%' }}>
				<AdminSidebar title="Admin" categories={adminNavCategories} />
				<div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>{props.children}</div>
			</div>
			{showNewUserDialog && <NewUserDialog />}
		</PageWrapper>
	);
}
