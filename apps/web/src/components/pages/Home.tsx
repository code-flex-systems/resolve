'use client';

import { useEffect } from 'react';
import MyQueue from '@/components/home/MyQueue';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import ProfileAvatar from '../home/ProfileAvatar';
import RecentComments from '../home/RecentComments';
import MyClaimsMetric from '../home/MyClaimsMetric';
import MyDeadlinesMetric from '../home/MyDeadlinesMetric';
import TeamRecoveryMetric from '../home/TeamRecoveryMetric';
import MyDeskAssignments from '../home/MyDeskAssignments';
import { useClerkSession } from '@/lib/auth/use-clerk-session';

export default function Home() {
	const { data: session } = useClerkSession();
	const resetChecklistsStore = useChecklistsStore((state) => state.reset);

	useEffect(() => {
		return () => {
			resetChecklistsStore();
		};
	}, []);

	return (
		<div style={styles.container}>
			{/* Toolbar */}
			<div      style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
				<span   style={{ fontSize: 20, fontWeight: 'bold' }}>
					Welcome back, {session?.user?.name?.split(' ')?.[0] ?? ''}!
				</span>
				<ProfileAvatar />
			</div>

			{/* Dashboard Content */}
			<div
				 style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', overflow: 'auto' }}
			>
				<div style={{ display: 'flex', flexWrap: 'wrap' }}>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						{/* <div>
							<MyClaimsMetric />
						</div> */}
						<div>
							<MyDeskAssignments />
						</div>
						<div>
							<TeamRecoveryMetric />
						</div>
						{/* <div>
							<RecentComments />
						</div> */}
					</div>

					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<div>
							<MyQueue />
						</div>
					</div>
					<div style={{ display: 'flex', flexDirection: 'column' }}>
						<div>
							<MyDeadlinesMetric />
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		flex: 1,
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		p: 2.5,
	},
};
