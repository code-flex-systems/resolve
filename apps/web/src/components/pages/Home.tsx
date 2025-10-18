'use client';

import { Box, Fade, Grid, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import Recents from '@/components/home/Recents';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import ProfileAvatar from '../common/ProfileAvatar';
import RecentComments from '../home/RecentComments';
import HomeSearch from '../home/HomeSearch';
import FQStepper from '../home/FQStepper';
import ClaimsMetric from '../metrics/Claims/ClaimsMetric';
import { useSession } from 'next-auth/react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import WobbleLoadingIndicator from '../common/WobbleLoadingIndicator';
import Calendar from '../home/Calendar';

export default function Home() {
	const { data: session } = useSession();
	const resetChecklistsStore = useChecklistsStore((state) => state.reset);
	const users = session ? [session.user.email] : [];
	const { isFetching: isFetchingRecentComments } = useCommentTrpc().list(
		{ filters: { userId: session?.user.id } },
		{ enabled: !users.length }
	);
	const { data: recents = [], isFetching: isFetchingRecentChecklists } = useChecklistTrpc().listRecents();
	const { isFetching: isFetchingChecklistStats } = useChecklistTrpc().stats(
		{
			users,
		},
		{ enabled: !users.length }
	);
	const isLoading = isFetchingRecentComments || isFetchingRecentChecklists || isFetchingChecklistStats;

	useEffect(() => {
		return () => resetChecklistsStore();
	}, []);

	return (
		<div style={styles.container}>
			<Stack width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
				<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
					<Typography fontSize={20} fontWeight="bold">
						{recents.length ? 'Welcome back!' : 'Welcome!'}
					</Typography>
					<ProfileAvatar />
				</Box>

				<Fade key={isLoading ? 'loading' : 'data'} in={true} timeout={500}>
					<Box
						width="100%"
						height="100vh"
						display="flex"
						justifyContent={isLoading || !recents.length ? 'center' : 'space-between'}
						alignItems="flex-start"
						overflow="auto"
					>
						{isLoading && <WobbleLoadingIndicator hideMsg />}
						{!isLoading && (
							<Grid container>
								{/* <Grid container direction="column"> */}
								<Grid>
									<HomeSearch />
								</Grid>
								<Grid>
									<Recents />
								</Grid>
								<Grid>
									<Calendar />
								</Grid>
								<Grid>
									<RecentComments />
								</Grid>

								{/* </Grid> */}
								{/* <Grid container flexWrap="wrap"> */}

								<Grid>
									<FQStepper />
								</Grid>
								{!!session?.user && (
									<Grid>
										<ClaimsMetric users={[session.user.id]} />
									</Grid>
								)}

								{/* </Grid> */}
							</Grid>
						)}
					</Box>
				</Fade>
			</Stack>
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
		backgroundColor: '#F7F8FA',
		padding: 20,
	},
};
