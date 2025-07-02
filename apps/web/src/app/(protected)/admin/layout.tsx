'use client';

import { PropsWithChildren } from 'react';
import PageWrapper from '@/components/common/PageWrapper';
import AdminTabs from '@/components/pages/AdminTabs';

export default function AdminLayout(props: PropsWithChildren) {
	return (
		<PageWrapper route="checklist">
			<div style={styles.container}>
				<AdminTabs />
				{props.children}
			</div>
		</PageWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'center',
		padding: 20,
	},
};
