'use client';

import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useDeadlineTrpc } from '@/hooks/trpc/useDeadlineTrpc';
import DeadlineListItem from '@/components/common/DeadlineListItem';
import { useRouter } from 'next/navigation';
import theme, { BASE_COLOR_LIGHT } from '@/styles/theme';
import dayjs from 'dayjs';
import WarningAmber from '@mui/icons-material/WarningAmber';
import AccessTime from '@mui/icons-material/AccessTime';

export default function MyClaimsDeadlines() {
	const router = useRouter();
	const { data = { rows: [], count: 0 }, isLoading } = useDeadlineTrpc().listDeadlines(
		{ personalOnly: true },
		{ refetchOnMount: 'always' }
	);
	const deadlines = data.rows;

	const handleClaimClick = (claimId: number) => {
		router.push(`/claims/${claimId}`);
	};

	// Calculate overdue and upcoming
	const now = dayjs();
	const overdue = deadlines.filter((d) => dayjs(d.deadline_date).isBefore(now));
	const upcoming = deadlines.filter(
		(d) => dayjs(d.deadline_date).isAfter(now) && dayjs(d.deadline_date).isBefore(now.add(7, 'days'))
	);

	return (
		<Paper sx={styles.container}>
			<Typography fontSize={13} fontWeight={600} color={BASE_COLOR_LIGHT} marginBottom={1.5}>
				Related Deadlines
			</Typography>

			{isLoading ? (
				<Stack spacing={1}>
					<Skeleton variant="rectangular" height={40} />
					<Skeleton variant="rectangular" height={60} />
					<Skeleton variant="rectangular" height={60} />
				</Stack>
			) : (
				<>
					{/* Deadline Counts */}
					<Box display="flex" gap={2} marginBottom={2}>
						<Box display="flex" alignItems="center" gap={0.5}>
							<WarningAmber sx={{ fontSize: 16, color: theme.palette.error.main }} />
							<Typography fontSize={12} color="text.secondary">
								<strong>{overdue.length}</strong> Overdue
							</Typography>
						</Box>
						<Box display="flex" alignItems="center" gap={0.5}>
							<AccessTime sx={{ fontSize: 16, color: theme.palette.warning.main }} />
							<Typography fontSize={12} color="text.secondary">
								<strong>{upcoming.length}</strong> Upcoming
							</Typography>
						</Box>
					</Box>

					{/* Deadline List */}
					<Box sx={styles.scrollContainer}>
						{deadlines.length === 0 ? (
							<Box sx={styles.emptyState}>
								<Typography fontSize={13} color="text.secondary" textAlign="center" fontStyle="italic">
									No deadlines for your claims
								</Typography>
							</Box>
						) : (
							<Stack spacing={1}>
								{deadlines.slice(0, 10).map((deadline) => (
									<DeadlineListItem
										key={deadline.id}
										deadline={deadline}
										onClaimClick={handleClaimClick}
										showTime={false}
									/>
								))}
							</Stack>
						)}
					</Box>
					{data.count > 10 && (
						<Typography fontSize={11} color="text.secondary" textAlign="center" marginTop={1}>
							Showing 10 of {data.count} deadlines
						</Typography>
					)}
				</>
			)}
		</Paper>
	);
}

const styles = {
	container: {
		padding: '16px',
		border: `1px solid ${theme.palette.divider}`,
		height: '100%',
		minWidth: 280,
	},
	scrollContainer: {
		height: 'calc(100% - 90px)',
		overflowY: 'auto',
		overflowX: 'hidden',
		paddingRight: 1,
		'&::-webkit-scrollbar': {
			width: '6px',
		},
		'&::-webkit-scrollbar-track': {
			background: theme.palette.action.hover,
			borderRadius: '3px',
		},
		'&::-webkit-scrollbar-thumb': {
			background: theme.palette.action.selected,
			borderRadius: '3px',
			'&:hover': {
				background: theme.palette.action.disabled,
			},
		},
	},
	emptyState: {
		padding: 4,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 100,
	},
};
