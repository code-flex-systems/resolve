'use client';

import { Box, Grid, Typography } from '@mui/material';
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
		<Box sx={styles.container}>
			{/* Toolbar */}
			<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" marginBottom="10px">
				<Typography fontSize={20} fontWeight="bold">
					Welcome back, {session?.user?.name?.split(' ')?.[0] ?? ''}!
				</Typography>
				<ProfileAvatar />
			</Box>

			{/* Dashboard Content */}
			<Box
				width="100%"
				height="100%"
				display="flex"
				justifyContent="space-between"
				alignItems="flex-start"
				overflow="auto"
			>
				<Grid container>
					<Grid container direction="column">
						{/* <Grid>
							<MyClaimsMetric />
						</Grid> */}
						<Grid>
							<MyDeskAssignments />
						</Grid>
						<Grid>
							<TeamRecoveryMetric />
						</Grid>
						{/* <Grid>
							<RecentComments />
						</Grid> */}
					</Grid>

					<Grid container direction="column">
						<Grid>
							<MyQueue />
						</Grid>
					</Grid>
					<Grid container direction="column">
						<Grid>
							<MyDeadlinesMetric />
						</Grid>
					</Grid>
				</Grid>
			</Box>
		</Box>
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
