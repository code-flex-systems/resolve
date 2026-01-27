'use client';

import { useState, useMemo } from 'react';
import { Box, FormControl, MenuItem, Select, SelectChangeEvent, Skeleton, Stack, Typography } from '@mui/material';
import { useDeadlineTrpc, Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import DeadlineListItem from '@/components/common/DeadlineListItem';
import { useRouter } from 'next/navigation';
import theme, { containerStyles } from '@/styles/theme';
import dayjs from 'dayjs';
import { DeadlineStatus } from '@/config/enums';
import { CalendarIcon } from '@mui/x-date-pickers-pro';

type DeadlineFilter = 'all' | 'pending' | 'completed' | 'overdue';

export default function MyClaimsDeadlines() {
	const router = useRouter();
	const [filter, setFilter] = useState<DeadlineFilter>('all');
	const { data = { rows: [], count: 0 }, isLoading } = useDeadlineTrpc().listDeadlines(
		{ personalOnly: true },
		{ refetchOnMount: 'always' }
	);
	const deadlines = data.rows;

	const handleClaimClick = (claimId: number) => {
		router.push(`/my-claims/${claimId}`);
	};

	const handleFilterChange = (event: SelectChangeEvent<DeadlineFilter>) => {
		setFilter(event.target.value as DeadlineFilter);
	};

	// Calculate counts and filter deadlines
	const { counts, filteredDeadlines } = useMemo(() => {
		const now = dayjs();

		const isOverdue = (d: Deadline) => d.status === DeadlineStatus.PENDING && dayjs(d.deadline_date).isBefore(now);
		const isPending = (d: Deadline) => d.status === DeadlineStatus.PENDING && !dayjs(d.deadline_date).isBefore(now);
		const isCompleted = (d: Deadline) => d.status === DeadlineStatus.MET || d.status === DeadlineStatus.MISSED;

		const overdueList = deadlines.filter(isOverdue);
		const pendingList = deadlines.filter(isPending);
		const completedList = deadlines.filter(isCompleted);

		const counts = {
			all: deadlines.length,
			pending: pendingList.length,
			completed: completedList.length,
			overdue: overdueList.length,
		};

		let filtered: Deadline[];
		switch (filter) {
			case 'overdue':
				filtered = overdueList;
				break;
			case 'pending':
				filtered = pendingList;
				break;
			case 'completed':
				filtered = completedList;
				break;
			default:
				filtered = deadlines;
		}

		return { counts, filteredDeadlines: filtered };
	}, [deadlines, filter]);

	return (
		<Box sx={{ ...containerStyles.section, ...styles.container }}>
			<Typography sx={containerStyles.sectionTitle}>
				<CalendarIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
				Related Deadlines
			</Typography>
			<Box sx={containerStyles.sectionContent}>
				{isLoading ? (
					<Stack spacing={1}>
						<Skeleton variant="rectangular" height={40} />
						<Skeleton variant="rectangular" height={60} />
						<Skeleton variant="rectangular" height={60} />
					</Stack>
				) : (
					<>
						{/* Filter Dropdown */}
						<FormControl size="small" sx={{ marginBottom: 2, minWidth: 180 }}>
							<Select value={filter} onChange={handleFilterChange} sx={{ fontSize: 13 }}>
								<MenuItem value="all">All ({counts.all})</MenuItem>
								<MenuItem value="pending">Upcoming ({counts.pending})</MenuItem>
								<MenuItem value="overdue">Overdue ({counts.overdue})</MenuItem>
								<MenuItem value="completed">Completed ({counts.completed})</MenuItem>
							</Select>
						</FormControl>

						{/* Deadline List */}
						<Box sx={styles.scrollContainer}>
							{filteredDeadlines.length === 0 ? (
								<Box sx={styles.emptyState}>
									<Typography
										fontSize={13}
										color="text.secondary"
										textAlign="center"
										fontStyle="italic"
									>
										{filter === 'all' ? 'No deadlines for your claims' : `No ${filter} deadlines`}
									</Typography>
								</Box>
							) : (
								<Stack spacing={1}>
									{filteredDeadlines.slice(0, 10).map((deadline) => (
										<DeadlineListItem
											key={deadline.id}
											deadline={deadline}
											onClaimClick={handleClaimClick}
											showTime={false}
											showDate={true}
										/>
									))}
								</Stack>
							)}
						</Box>
						{filteredDeadlines.length > 10 && (
							<Typography fontSize={11} color="text.secondary" textAlign="center" marginTop={1}>
								Showing 10 of {filteredDeadlines.length} deadlines
							</Typography>
						)}
					</>
				)}
			</Box>
		</Box>
	);
}

const styles = {
	container: {
		height: '100%',
		width: 300,
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
