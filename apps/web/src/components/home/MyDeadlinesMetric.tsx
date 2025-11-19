'use client';

import { Box, Paper, Skeleton, Stack, Typography } from '@mui/material';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { DeadlineStatus } from '@/config/enums';
import theme from '@/styles/theme';
import { useMemo } from 'react';
import AccessTime from '@mui/icons-material/AccessTime';
import Warning from '@mui/icons-material/Warning';
import dayjs from 'dayjs';

export default function MyDeadlinesMetric() {
	const { data: deadlines = [], isLoading } = useRecoveryTrpc().listDeadlines(
		{ personalOnly: true },
		{ enabled: true }
	);

	// Calculate overdue and upcoming counts
	const { overdueCount, upcomingCount } = useMemo(() => {
		const today = dayjs().startOf('day');
		const nextWeek = today.add(7, 'days');

		let overdue = 0;
		let upcoming = 0;

		deadlines.forEach((deadline) => {
			const deadlineDate = dayjs(deadline.deadline_date).startOf('day');

			// Overdue: past due date and not met
			if (deadlineDate.valueOf() < today.valueOf() && deadline.status !== DeadlineStatus.MET) {
				overdue++;
			}

			// Upcoming: within next 7 days and status is pending
			if (
				deadlineDate.valueOf() >= today.valueOf() &&
				deadlineDate.valueOf() < nextWeek.valueOf() &&
				deadline.status === DeadlineStatus.PENDING
			) {
				upcoming++;
			}
		});

		return { overdueCount: overdue, upcomingCount: upcoming };
	}, [deadlines]);

	return (
		<Paper elevation={0} sx={styles.container}>
			{isLoading ? (
				<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 4 }} />
			) : (
				<Stack width="100%" height="100%" spacing={2}>
					{/* Header */}
					<Box>
						<Typography variant="subtitle1" fontSize={14} fontWeight={600}>
							My Deadlines
						</Typography>
					</Box>

					{/* Deadline Counts */}
					<Box display="flex" gap={3} alignItems="center">
						{/* Overdue */}
						<Box display="flex" alignItems="center" gap={1}>
							<Box
								display="flex"
								alignItems="center"
								justifyContent="center"
								width={48}
								height={48}
								borderRadius="50%"
								bgcolor={theme.palette.error.light}
							>
								<Warning sx={{ color: 'white', fontSize: 28 }} />
							</Box>
							<Box>
								<Typography variant="h4" fontSize={32} fontWeight={700} color="error">
									{overdueCount}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Overdue
								</Typography>
							</Box>
						</Box>

						{/* Upcoming */}
						<Box display="flex" alignItems="center" gap={1}>
							<Box
								display="flex"
								alignItems="center"
								justifyContent="center"
								width={48}
								height={48}
								borderRadius="50%"
								bgcolor={theme.palette.warning.light}
							>
								<AccessTime sx={{ color: 'white', fontSize: 28 }} />
							</Box>
							<Box>
								<Typography variant="h4" fontSize={32} fontWeight={700} color="warning.dark">
									{upcomingCount}
								</Typography>
								<Typography variant="caption" color="text.secondary">
									Next 7 Days
								</Typography>
							</Box>
						</Box>
					</Box>

					{/* Summary */}
					<Box>
						<Typography variant="body2" color="text.secondary" fontSize={12}>
							{overdueCount === 0 && upcomingCount === 0
								? 'No pending deadlines'
								: `Stay on top of your deadlines`}
						</Typography>
					</Box>
				</Stack>
			)}
		</Paper>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 180,
		padding: '20px',
		borderRadius: 4,
		margin: '15px',
		background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
		border: `1px solid ${theme.palette.primary.main}`,
	},
};
