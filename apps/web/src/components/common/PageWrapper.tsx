'use client';
import { PropsWithChildren, useEffect, useMemo } from 'react';
import SiteHeader from './SiteHeader';
import * as actions from '@/state/global/actions';
import GPTSidebar, { NavItem } from './GPTSidebar';
import { Home, ManageAccounts } from '@mui/icons-material';
import theme from '@/styles/theme';
import useIsAdmin from '@/hooks/useIsAdmin';

export default function PageWrapper(props: { route: string; isNavItem?: boolean } & PropsWithChildren) {
	const { route, isNavItem = true } = props;
	const isAdmin = useIsAdmin();

	const navItems = useMemo(() => {
		const items: NavItem[] = [{ label: 'Home', route: '/home', icon: <Home sx={{ fontSize: 23 }} /> }];
		if (isAdmin) items.push({ label: 'Admin', route: '/admin', icon: <ManageAccounts sx={{ fontSize: 23 }} /> });
		return items;
	}, [isAdmin]);

	useEffect(() => {
		if (isNavItem) actions.updateSelectedPage(route);
	}, [isNavItem]);

	return (
		<div style={styles.container}>
			<GPTSidebar
				items={navItems}
				hoverColor={theme.palette.primary.main}
				backgroundColor={theme.palette.primary.main}
			/>
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
		height: '100vh',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
};
