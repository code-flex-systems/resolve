'use client';

import { Box, Fade, Stack, Typography } from '@mui/material';
import { useEffect } from 'react';
import Recents from '@/components/home/Recents';
import { SLICES } from '@/state/storeConfig';
import { resetStoreSlice } from '@/state/store';
import ProfileAvatar from '../common/ProfileAvatar';
import RecentComments from '../home/RecentComments';
import HomeSearch from '../home/HomeSearch';
import FQStepper from '../home/FQStepper';
import ClaimsMetric from '../metrics/ClaimsMetric';
import { useSession } from 'next-auth/react';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useCommentTrpc } from '@/hooks/trpc/useCommentTrpc';
import WobbleLoadingIndicator from '../common/WobbleLoadingIndicator';

export default function Home() {
	const { data: session } = useSession();
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
		return () => resetStoreSlice(SLICES.CHECKLISTS);
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
						flex={1}
						display="flex"
						justifyContent={isLoading || !recents.length ? 'center' : 'space-between'}
						alignItems="center"
					>
						{isLoading && <WobbleLoadingIndicator hideMsg />}
						{!isLoading && (
							<>
								<Stack
									height="100%"
									display="flex"
									justifyContent="flex-start"
									alignItems="flex-start"
									marginRight="20px"
								>
									<Box display="flex" justifyContent="flex-start" alignItems="flex-start">
										<FQStepper />
										<Recents />
									</Box>
									<RecentComments />
								</Stack>

								<Box
									width="100%"
									maxWidth={700}
									// height="calc(100% - 30px)"
									height="100%"
									display="flex"
									justifyContent="center"
									alignItems="flex-start"
									padding="10px 0px 20px"
								>
									<HomeSearch />
								</Box>

								<Box
									height="100%"
									display="flex"
									justifyContent="flex-start"
									alignItems="flex-start"
									marginLeft="20px"
									marginTop="15px"
								>
									{!!session?.user && <ClaimsMetric users={[session.user.email]} />}
								</Box>
							</>
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
