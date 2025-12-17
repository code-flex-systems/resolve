'use client';
import { PropsWithChildren, useMemo } from 'react';
import Sidebar, { NavItem } from './Sidebar';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Dashboard from '@mui/icons-material/Dashboard';
import Search from '@mui/icons-material/Search';
import Security from '@mui/icons-material/Security';
import FolderOpen from '@mui/icons-material/FolderOpen';
import Business from '@mui/icons-material/Business';
import useIsAdmin from '@/hooks/useIsAdmin';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { Box } from '@mui/material';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { BG_SECONDARY } from '@/styles/theme';

export default function PageWrapper({
	bgcolor = BG_SECONDARY,
	children,
}: { bgcolor?: string } & PropsWithChildren) {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const navItems = useMemo(() => {
		const items: NavItem[] = [
			{ label: 'Home', route: '/home', icon: <Search sx={{ fontSize: 23 }} /> },
			{ label: 'Dashboard', route: '/dashboard', icon: <Dashboard sx={{ fontSize: 23 }} /> },
			{ label: 'Documents', route: '/documents', icon: <FolderOpen sx={{ fontSize: 23 }} /> },
			{ label: 'Parties', route: '/parties', icon: <Business sx={{ fontSize: 23 }} /> },
		];
		if (claim) {
			items.push({
				label: claim.claim_number ?? '',
				route: '/checklist',
				icon: <ContentPasteSearch sx={{ fontSize: 23 }} />,
			});
		}
		if (isAdmin || isSuperAdmin) {
			items.push({ label: 'Admin', route: '/admin', icon: <Security sx={{ fontSize: 23 }} /> });
		}
		return items;
	}, [isAdmin, isSuperAdmin, claim]);

	return (
		<Box
			sx={{
				width: '100vw',
				height: '100vh',
				display: 'flex',
				justifyContent: 'flex-start',
				alignItems: 'flex-start',
				bgcolor,
			}}
		>
			<Sidebar items={navItems} />
			<Box
				sx={{
					flex: 1,
					minWidth: 0,
					ml: '60px',
					height: '100%',
					display: 'flex',
					flexDirection: 'column',
					justifyContent: 'flex-start',
					alignItems: 'flex-start',
				}}
			>
				{children}
			</Box>
		</Box>
	);
}
