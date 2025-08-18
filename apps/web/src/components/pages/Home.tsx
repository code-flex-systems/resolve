'use client';

import { Box, Stack, Typography } from '@mui/material';
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

export default function Home() {
	const { data: session } = useSession();
	useEffect(() => {
		return () => resetStoreSlice(SLICES.CHECKLISTS);
	}, []);

	return (
		<div style={styles.container}>
			<Stack width="100%" height="100%" display="flex" justifyContent="flex-start" alignItems="flex-start">
				<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" marginBottom="20px">
					<Typography fontSize={20} fontWeight="bold">
						Welcome back!
					</Typography>
					<ProfileAvatar />
				</Box>

				<Box width="100%" flex={1} display="flex" justifyContent="space-between" alignItems="center">
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
						height="calc(100% - 30px)"
						display="flex"
						justifyContent="center"
						alignItems="flex-start"
					>
						<HomeSearch />
					</Box>

					<Box
						height="100%"
						display="flex"
						justifyContent="flex-start"
						alignItems="flex-start"
						marginLeft="20px"
					>
						{!!session?.user && <ClaimsMetric users={[session.user.email]} />}
					</Box>
				</Box>
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
