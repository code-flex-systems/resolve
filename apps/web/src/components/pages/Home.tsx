'use client';

import { Box, Fade, Grid, Skeleton, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import Recents from '@/components/home/Recents';
import { useChecklistsStore } from '@/stores/useChecklistsStore';
import ProfileAvatar from '../home/ProfileAvatar';
import RecentComments from '../home/RecentComments';
import MyClaimsMetric from '../home/MyClaimsMetric';
import MyDeadlinesMetric from '../home/MyDeadlinesMetric';
import MyRecoveryMetric from '../home/MyRecoveryMetric';
import RingLoadingIndicator from '../common/RingLoadingIndicator';
import Calendar from '../home/Calendar';
import PageWrapper from '../common/PageWrapper';
import { useSession } from 'next-auth/react';

export default function Home() {
	const { data: session } = useSession();
	const resetChecklistsStore = useChecklistsStore((state) => state.reset);
	const [isInitialLoad, setIsInitialLoad] = useState(true);

	useEffect(() => {
		// Show initial loading state briefly, then let components load independently
		const timer = setTimeout(() => setIsInitialLoad(false), 300);
		return () => {
			clearTimeout(timer);
			resetChecklistsStore();
		};
	}, []);

	return (
		<PageWrapper>
			<div style={styles.container}>
				<Stack width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
					{/* Loading State */}
					<Fade in={isInitialLoad} timeout={500}>
						<Box
							width="100%"
							height="100%"
							display={isInitialLoad ? 'flex' : 'none'}
							flexDirection="column"
							justifyContent="center"
							alignItems="center"
							position="relative"
						>
							{/* Full-page skeleton */}
							<Skeleton
								variant="rectangular"
								width="100%"
								height="100%"
								animation="pulse"
								sx={{ position: 'absolute', top: 0, left: 0, borderRadius: 2 }}
							/>
							{/* Loading indicator over skeleton */}
							<Box
								position="relative"
								zIndex={1}
								display="flex"
								flexDirection="column"
								alignItems="center"
								justifyContent="center"
							>
								<RingLoadingIndicator message="Loading workspace..." />
							</Box>
						</Box>
					</Fade>

					{/* Loaded Content */}
					<Fade in={!isInitialLoad} timeout={500}>
						<Box
							width="100%"
							height="100%"
							display={!isInitialLoad ? 'flex' : 'none'}
							flexDirection="column"
						>
							{/* Toolbar - only shown when loaded */}
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
											<Recents />
										</Grid>
										<Grid>
											<Calendar />
										</Grid>
										<Grid>
											<RecentComments />
										</Grid>
									</Grid>
									{/* <Grid>
										<FQStepper />
									</Grid> */}
								</Grid>
							</Box>
						</Box>
					</Fade>
				</Stack>
			</div>
		</PageWrapper>
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
