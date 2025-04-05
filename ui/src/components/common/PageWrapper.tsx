import { PropsWithChildren, useEffect } from 'react';
import Sidebar from './Sidebar';
import SiteHeader from './SiteHeader';
import * as actions from '../../state/global/actions';

export default function PageWrapper(props: { route: string; isNavItem?: boolean } & PropsWithChildren) {
	const { route, isNavItem = true } = props;

	useEffect(() => {
		if (isNavItem) actions.updateSelectedPage(route);
	}, [isNavItem]);

	return (
		<div style={styles.container}>
			<Sidebar />
			<div style={styles.content}>
				<SiteHeader />
				{props.children}
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
	content: {
		width: '100%',
		height: '100vh',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
};
