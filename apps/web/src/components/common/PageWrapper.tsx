'use client';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import SiteHeader from './SiteHeader';
import * as actions from '@/state/global/actions';
import Sidebar, { NavItem } from './Sidebar';
import { Home, ManageAccounts, Security } from '@mui/icons-material';
import theme from '@/styles/theme';
import useIsAdmin from '@/hooks/useIsAdmin';
import useIsSuperAdmin from '@/hooks/useIsSuperAdmin';

export default function PageWrapper(props: { route: string; isNavItem?: boolean } & PropsWithChildren) {
	const { route, isNavItem = true } = props;
	const isAdmin = useIsAdmin();
	const isSuperAdmin = useIsSuperAdmin();

	const navItems = useMemo(() => {
		const items: NavItem[] = [{ label: 'Home', route: '/home', icon: <Home sx={{ fontSize: 23 }} /> }];
		if (isAdmin || isSuperAdmin)
			items.push({ label: 'Admin', route: '/admin', icon: <ManageAccounts sx={{ fontSize: 23 }} /> });
		if (isSuperAdmin) {
			items.push({ label: 'Super Admin', route: '/super-admin', icon: <Security sx={{ fontSize: 23 }} /> });
		}
		return items;
	}, [isAdmin, isSuperAdmin]);

	useEffect(() => {
		if (isNavItem) actions.updateSelectedPage(route);
	}, [isNavItem]);

	return (
		<div style={styles.container}>
			<Sidebar items={navItems} />
			<div style={styles.content}>
				<SiteHeader />
				{props.children}
			</div>
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
