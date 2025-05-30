'use client';
import { PropsWithChildren, useEffect } from 'react';
import Sidebar from './Sidebar';
import SiteHeader from './SiteHeader';
import * as actions from '@/state/global/actions';
import GPTSidebar, { NavItem } from './GPTSidebar';
import { Home, ManageAccounts } from '@mui/icons-material';
import theme from '@/styles/theme';

const navItems: NavItem[] = [
	{ label: 'Home', route: '/home', icon: <Home sx={{ fontSize: 23 }} /> },
	{ label: 'Admin', route: '/admin', icon: <ManageAccounts sx={{ fontSize: 23 }} /> },
];

export default function PageWrapper(props: { route: string; isNavItem?: boolean } & PropsWithChildren) {
	const { route, isNavItem = true } = props;

	useEffect(() => {
		if (isNavItem) actions.updateSelectedPage(route);
	}, [isNavItem]);

	return (
		<div style={styles.container}>
			<GPTSidebar
				items={navItems}
				hoverColor={theme.palette.secondary.main}
				backgroundColor={theme.palette.secondary.main}
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
