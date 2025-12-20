'use client';

import { PropsWithChildren, useEffect } from 'react';
import { Box } from '@mui/material';
import PageWrapper from '@/components/common/PageWrapper';
import AdminSidebar, { AdminNavCategory } from '@/components/admin/AdminSidebar';
import { useAdminStore } from '@/stores/useAdminStore';

// Icons
import BusinessIcon from '@mui/icons-material/Business';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonIcon from '@mui/icons-material/Person';

const partyNavCategories: AdminNavCategory[] = [
	{
		label: 'Party Management',
		icon: <BusinessIcon fontSize="small" color="secondary" />,
		items: [
			{
				label: 'Parties',
				route: '/parties/parties',
				icon: <BusinessIcon fontSize="small" />,
			},
			{
				label: 'Addresses',
				route: '/parties/addresses',
				icon: <LocationOnIcon fontSize="small" />,
			},
			{
				label: 'Representatives',
				route: '/parties/representatives',
				icon: <PersonIcon fontSize="small" />,
			},
		],
		defaultExpanded: true,
		hideHeader: true,
	},
];

export default function PartiesLayout(props: PropsWithChildren) {
	const resetAdminStore = useAdminStore((state) => state.reset);

	useEffect(() => {
		return () => resetAdminStore();
	}, [resetAdminStore]);

	return (
		<PageWrapper>
			<Box sx={{ display: 'flex', height: '100%', width: '100%' }}>
				<AdminSidebar title="Party Management" categories={partyNavCategories} />
				<Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>{props.children}</Box>
			</Box>
		</PageWrapper>
	);
}
