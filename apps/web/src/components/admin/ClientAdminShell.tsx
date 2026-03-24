'use client';

import {
	IconBinaryTree,
	IconBuilding,
	IconCashBanknote,
	IconChecklist,
	IconClipboard,
	IconClipboardCheck,
	IconCurrencyDollar,
	IconDesk,
	IconFileDescription,
	IconFileSearch,
	IconFolder,
	IconGavel,
	IconHistory,
	IconLayoutDashboard,
	IconList,
	IconMapPin,
	IconRss,
	IconSettings,
	IconSubtask,
	IconChartBar,
	IconChartDots,
	IconTimeline,
	IconUser,
	IconUserCog,
	IconUsers,
	IconWaveSquare,
} from '@tabler/icons-react';
import { PropsWithChildren, useEffect } from 'react';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import NewUserDialog from '@/components/admin/NewUserDialog';
import { useAdminStore } from '@/stores/useAdminStore';
import { useDeskLocationStore } from '@/stores/useDeskLocationStore';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import config from '@/config/config';

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
		icon: <IconUserCog size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/user-management/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			{
				label: 'Users',
				route: '/admin/user-management/users',
				icon: <IconUsers size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Checklists & Activity',
		icon: <IconChecklist size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/checklists/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			{
				label: 'Templates',
				route: '/admin/checklists/templates',
				icon: <IconChecklist size={20} />,
			},
			{
				label: 'Activity',
				route: '/admin/checklists/activity',
				icon: <IconWaveSquare size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Claim Management',
		icon: <IconFileSearch size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/claims/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			{
				label: 'All Claims',
				route: '/admin/claims/all',
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
		label: 'Workflow Management',
		icon: <IconTimeline size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/workflow-management/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			...(config.FEATURES.DESK_HIERARCHY
				? [
						{
							label: 'Workflows',
							route: '/admin/workflow-management/workflows',
							icon: <IconBinaryTree size={20} />,
						},
						{
							label: 'Desk Locations',
							route: '/admin/workflow-management/desk-locations',
							icon: <IconDesk size={20} />,
						},
						{
							label: 'Desk Assignments',
							route: '/admin/workflow-management/desk-assignments',
							icon: <IconClipboard size={20} />,
						},
						{
							label: 'Tasks',
							route: '/admin/workflow-management/tasks',
							icon: <IconSubtask size={20} />,
						},
						{
							label: 'Execution History',
							route: '/admin/workflow-management/execution-history',
							icon: <IconHistory size={20} />,
						},
					]
				: []),
		],
		defaultExpanded: false,
	},
	{
		label: 'Party Management',
		icon: <IconBuilding size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/party-management/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
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
		icon: <IconCurrencyDollar size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/financial/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			{
				label: 'Recovery',
				route: '/admin/financial/recovery',
				icon: <IconCashBanknote size={20} />,
			},
			{
				label: 'Payments & Cashflow',
				route: '/admin/financial/payments',
				icon: <IconChartBar size={20} />,
			},
			{
				label: 'Settlements',
				route: '/admin/financial/settlements',
				icon: <IconChartDots size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'Documents',
		icon: <IconFolder size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/documents/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
			{
				label: 'Documents',
				route: '/admin/documents/documents',
				icon: <IconFileDescription size={20} />,
			},
		],
		defaultExpanded: false,
	},
	{
		label: 'System',
		icon: <IconSettings size={18} stroke={1.5} />,
		items: [
			{
				label: 'Overview',
				route: '/admin/system/overview',
				icon: <IconLayoutDashboard size={20} />,
			},
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
