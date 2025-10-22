'use client';
import { PropsWithChildren, useMemo } from 'react';
import Sidebar, { NavItem } from './Sidebar';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Home from '@mui/icons-material/Home';
import ManageAccounts from '@mui/icons-material/ManageAccounts';
import Security from '@mui/icons-material/Security';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { Fade } from '@mui/material';

export default function PageWrapper({ bgcolor = '#F9FAFC', children }: { bgcolor?: string } & PropsWithChildren) {
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const { data: claim } = useClaimTrpc().get(
		{ checklistId, claimId },
		{ enabled: checklistId !== -1 && claimId !== -1 }
	);

	const navItems = useMemo(() => {
		const items: NavItem[] = [{ label: 'Home', route: '/home', icon: <Home sx={{ fontSize: 23 }} /> }];
		if (claim) {
			items.push({
				label: claim.claim_number ?? '',
				route: '/checklist',
				icon: <ContentPasteSearch sx={{ fontSize: 23 }} />,
			});
		}
		if (isAdmin || isSuperAdmin)
			items.push({ label: 'Admin', route: '/admin', icon: <Security sx={{ fontSize: 23 }} /> });
		if (isSuperAdmin) {
			items.push({ label: 'Super Admin', route: '/super-admin', icon: <Security sx={{ fontSize: 23 }} /> });
		}
		return items;
	}, [isAdmin, isSuperAdmin, claim]);

	return (
		<div style={{ ...styles.container, backgroundColor: bgcolor }}>
			<Sidebar items={navItems} />
			<Fade in={true} timeout={1000}>
				<div style={styles.content}>{children}</div>
			</Fade>
		</div>
	);
}

const styles = {
	container: {
		width: '100vw',
		height: '100vh',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
	content: {
		flex: 1,
		minWidth: 0,
		marginLeft: 60,
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
};
