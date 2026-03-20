'use client';

import { IconBuilding, IconMapPin, IconUser } from '@tabler/icons-react';
import { PropsWithChildren, useEffect } from 'react';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import { useAdminStore } from '@/stores/useAdminStore';

// Icons

const partyNavCategories: AdminNavCategory[] = [
	{
		label: 'Party Management',
		icon: <IconBuilding fontSize="small" color="neutral" />,
		items: [
			{
				label: 'Parties',
				route: '/parties/parties',
				icon: <IconBuilding size={20} />,
			},
			{
				label: 'Addresses',
				route: '/parties/addresses',
				icon: <IconMapPin size={20} />,
			},
			{
				label: 'Representatives',
				route: '/parties/representatives',
				icon: <IconUser size={20} />,
			},
		],
		defaultExpanded: true,
		hideHeader: true,
	},
];

export default function ClientPartiesShell(props: PropsWithChildren) {
	const resetAdminStore = useAdminStore((state) => state.reset);

	useEffect(() => {
		return () => resetAdminStore();
	}, [resetAdminStore]);

	return (
		<PageWrapper>
			<div style={{ display: 'flex', height: '100%', width: '100%' }}>
				<AdminSidebar title="Party Management" categories={partyNavCategories} />
				<div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>{props.children}</div>
			</div>
		</PageWrapper>
	);
}
