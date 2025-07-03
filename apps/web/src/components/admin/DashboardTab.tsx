'use client';

import { Box, Stack } from '@mui/material';
import { Checklist, ContentPasteSearch, People, NetworkCheck } from '@mui/icons-material';
import SimpleMetric from '../metrics/SimpleMetric';
import theme, { OFFWHITE_COLOR } from '@/styles/theme';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useClaimTrpc } from '@/hooks/trpc/useClaimTrpc';
import { useRouter } from 'next/navigation';
import { useFeedTrpc } from '@/hooks/trpc/useFeedTrpc';
import { useState } from 'react';
import ClaimsMetric from '../metrics/ClaimsMetric';

export default function DashboardTab() {
	const router = useRouter();
	const [selected, setSelected] = useState<string | null>(null);
	const { data: userCounts, isFetching: isFetchingUsers } = useUserTrpc().count({});
	const { data: checklistCounts, isFetching: isFetchingChecklists } = useChecklistTrpc().count({});
	const { data: claimCounts, isFetching: isFetchingClaims } = useClaimTrpc().count({});
	const { data: feedCounts, isFetching: isFetchingFeeds } = useFeedTrpc().count({});

	const onSelect = (key: string) => {
		setSelected(selected === key ? null : key);
	};

	return (
		<Stack
			width="100%"
			flex={1}
			display="flex"
			justifyContent="flex-start"
			alignContent="flex-start"
			padding="10px"
		>
			<Box width="100%" display="flex" justifyContent="flex-start" alignContent="flex-start">
				<SimpleMetric
					title="users"
					onClick={() => router.push('/admin/users')}
					onSelect={() => onSelect('users')}
					icon={<People sx={styles.simpleMetricIcon} />}
					color="rgba(33, 106, 196, 0.5)"
					values={userCounts}
					isLoading={isFetchingUsers}
					selected={selected === 'users'}
				/>
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
					title="feeds"
					onClick={() => router.push('/admin/feeds-and-claims')}
					onSelect={() => onSelect('feeds')}
					icon={<NetworkCheck sx={styles.simpleMetricIcon} />}
					color="rgba(33, 106, 196, 0.75)"
					values={feedCounts}
					isLoading={isFetchingFeeds}
					selected={selected === 'feeds'}
				/>
			</Box>
			<Box width="100%" display="flex" justifyContent="flex-start" alignContent="flex-start">
				<ClaimsMetric />
			</Box>
		</Stack>
	);
}

const styles = {
	simpleMetricIcon: {
		color: 'white',
		width: 30,
		height: 30,
	},
};
