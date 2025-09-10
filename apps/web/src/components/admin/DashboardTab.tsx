'use client';

import { Box, Paper, Stack, Typography } from '@mui/material';
import {
	Checklist,
	ContentPasteSearch,
	HorizontalSplit,
	People,
	Replay,
	RssFeed,
	Timelapse,
} from '@mui/icons-material';
import SimpleMetric from '../metrics/SimpleMetric';
import theme, { BASE_COLOR_LIGHT, PURPLE } from '@/styles/theme';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useRouter } from 'next/navigation';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import { useState } from 'react';
import ClaimsMetric from '../metrics/Claims/ClaimsMetric';
import UserActivityMetric from '../metrics/UserActivity/UserActivityMetric';
import { useAdminSlice } from '@/state/store';
import ActionsMetric from '../metrics/ActionsMetric';
import StackedMetric from '../checklist/StackedMetric';

export default function DashboardTab() {
	const router = useRouter();
	const [selected, setSelected] = useState<string | null>(null);
	const selectedChecklistId = useAdminSlice((state) => state.selectedChecklistId);
	const { data: userCounts, isFetching: isFetchingUsers } = useUserTrpc().count({});
	const { data: checklistCounts, isFetching: isFetchingChecklists } = useChecklistTrpc().count({});
	const { data: claimCounts, isFetching: isFetchingClaims } = useClaimTrpc().count({});
	const { data: feedCounts, isFetching: isFetchingFeeds } = useFeedTrpc().count({});

	const onSelect = (key: string) => {
		setSelected(selected === key ? null : key);
	};

	return (
		<Box
			width="100%"
			flex={1}
			display="flex"
			justifyContent="flex-start"
			alignContent="flex-start"
			padding="10px 0px"
			bgcolor="#F7F8FA"
		>
			<Stack display="flex" justifyContent="flex-start" alignContent="flex-start" paddingTop="10px">
				<Paper elevation={0} sx={styles.paper}>
					<Typography fontSize={13} color={BASE_COLOR_LIGHT} paddingTop="10px" paddingLeft="10px">
						Quick Stats
					</Typography>
					<Box width={550} display="flex" justifyContent="space-between" alignContent="center" padding="40px">
						<StackedMetric
							icon={<Timelapse sx={{ fontSize: 25 }} />}
							value={'20d'}
							subtext="to end of quarter"
							fontSize={25}
							fontSizeSubtext={15}
						/>
						<StackedMetric
							icon={<HorizontalSplit sx={{ fontSize: 25 }} />}
							value={'50'}
							subtext="unprocessed claims"
							fontSize={25}
							fontSizeSubtext={15}
						/>
						<StackedMetric
							icon={<Replay sx={{ fontSize: 25, transform: 'scaleX(-1)' }} />}
							value={'3'}
							subtext="rollover claims"
							fontSize={25}
							fontSizeSubtext={15}
						/>
					</Box>
				</Paper>
				<Box display="flex" justifyContent="flex-start" alignContent="flex-start" paddingTop="10px">
					<Stack display="flex" justifyContent="flex-start" alignContent="flex-start">
						<SimpleMetric
							title="checklists"
							onClick={() => router.push('/admin/checklists')}
							onSelect={() => onSelect('checklists')}
							icon={<Checklist sx={styles.simpleMetricIcon} />}
							color={theme.palette.primary.main}
							values={checklistCounts}
							isLoading={isFetchingChecklists}
							selected={selected === 'checklists'}
						/>
						<SimpleMetric
							title="claims"
							onClick={() => router.push('/admin/feeds-and-claims')}
							onSelect={() => onSelect('claims')}
							icon={<ContentPasteSearch sx={styles.simpleMetricIcon} />}
							color={theme.palette.secondary.main}
							values={claimCounts}
							isLoading={isFetchingClaims}
							selected={selected === 'claims'}
						/>
						<SimpleMetric
							title="users"
							onClick={() => router.push('/admin/users')}
							onSelect={() => onSelect('users')}
							icon={<People sx={styles.simpleMetricIcon} />}
							color={theme.palette.warning.main}
							values={userCounts}
							isLoading={isFetchingUsers}
							selected={selected === 'users'}
						/>
						<SimpleMetric
							title="feeds"
							onClick={() => router.push('/admin/feeds-and-claims')}
							onSelect={() => onSelect('feeds')}
							icon={<RssFeed sx={styles.simpleMetricIcon} />}
							color={PURPLE}
							values={feedCounts}
							isLoading={isFetchingFeeds}
							selected={selected === 'feeds'}
						/>
					</Stack>
					<Box
						bgcolor="#F0F3F8"
						display="flex"
						height="fit-content"
						justifyContent="flex-start"
						alignContent="flex-start"
						borderRadius={6}
						padding="10px"
						marginLeft="10px"
						marginTop="10px"
					>
						<UserActivityMetric />
						<ClaimsMetric checklistId={selectedChecklistId} />
						<ActionsMetric />
					</Box>
				</Box>
			</Stack>
		</Box>
	);
}

const styles = {
	paper: {
		width: 'fit-content',
		borderRadius: 3,
		marginBottom: '10px',
	},
	simpleMetricIcon: {
		color: 'white',
		width: 30,
		height: 30,
	},
};
