'use client';

import { Box, Grid, Typography } from '@mui/material';
import { useEffect } from 'react';
import MyQueue from '@/components/home/MyQueue';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import ProfileAvatar from '../home/ProfileAvatar';
import RecentComments from '../home/RecentComments';
import MyClaimsMetric from '../home/MyClaimsMetric';
import MyDeadlinesMetric from '../home/MyDeadlinesMetric';
import MyRecoveryMetric from '../home/MyRecoveryMetric';
import Calendar from '../home/Calendar';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { BG_TERTIARY } from '@/styles/theme';

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
			<Box
				width="100%"
				display="flex"
				justifyContent="space-between"
				alignItems="center"
				marginBottom="10px"
			>
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
					<Grid container>
						<Grid>
							<MyClaimsMetric />
						</Grid>
						<Grid>
							<MyDeadlinesMetric />
						</Grid>
						<Grid>
							<MyRecoveryMetric />
						</Grid>
					</Grid>
					<Grid container>
						<Grid>
							<MyQueue />
						</Grid>
						<Grid>
							<Calendar />
						</Grid>
						<Grid>
							<RecentComments />
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
		bgcolor: BG_TERTIARY,
		p: 2.5,
	},
};
