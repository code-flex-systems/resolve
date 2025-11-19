'use client';

import { Box, Fade, Stack, Typography } from '@mui/material';
import { Deadline } from '@/hooks/trpc/useRecoveryTrpc';
import dayjs, { Dayjs } from 'dayjs';
import theme from '@/styles/theme';
import { DeadlineStatus } from '@/config/enums';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useRouter } from 'next/navigation';

interface DailyEventsListProps {
	deadlines: Deadline[];
	selectedDate: Dayjs | null;
}

/**
 * Get icon for deadline status
 */
function getDeadlineStatusIcon(status: string) {
	switch (status) {
		case DeadlineStatus.PENDING:
			return <TimelapseIcon sx={{ ...styles.icon, color: theme.palette.primary.main }} />;
		case DeadlineStatus.MET:
			return <CheckCircleIcon sx={{ ...styles.icon, color: theme.palette.success.main }} />;
		case DeadlineStatus.MISSED:
			return <CancelIcon sx={{ ...styles.icon, color: theme.palette.error.main }} />;
		case DeadlineStatus.EXTENDED:
			return <CalendarMonthIcon sx={{ ...styles.icon, color: theme.palette.warning.main }} />;
		default:
			return null;
	}
}

/**
 * Format deadline type for display
 */
function formatDeadlineType(type: string): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Displays a scrollable list of deadlines for the selected day
 */
export default function DailyEventsList({ deadlines, selectedDate }: DailyEventsListProps) {
	const router = useRouter();

	const handleClaimClick = (claimId: number) => {
		// Navigate to claim detail (could also open in a dialog/panel)
		router.push(`/claim/${claimId}`);
	};

	return (
		<Box sx={styles.container}>
			<Typography variant="subtitle2" fontWeight={600} fontSize={14} mb={1.5}>
				{selectedDate ? selectedDate.format('MMMM D, YYYY') : 'Select a date'}
			</Typography>

			<Fade key={selectedDate?.toString() ?? 'empty'} in={true} timeout={1000}>
				<Box sx={styles.scrollContainer}>
					{deadlines.length === 0 ? (
						<Box sx={styles.emptyState}>
							<Typography variant="body2" color="text.secondary" textAlign="center">
								No deadlines for this day
							</Typography>
						</Box>
					) : (
						<Stack spacing={1}>
							{deadlines.map((deadline) => (
								<Box key={deadline.id} sx={styles.deadlineItem}>
									<Stack spacing={0.5}>
										<Box
											width="100%"
											display="flex"
											justifyContent="space-between"
											alignItems="center"
											gap={0.5}
										>
											<Box display="flex" alignItems="center" gap={1}>
												{getDeadlineStatusIcon(deadline.status)}
												<Typography variant="body2" fontWeight={600} fontSize={13}>
													{formatDeadlineType(deadline.deadline_type)}
												</Typography>
											</Box>
											<Typography fontSize={12} color="text.secondary">
												{dayjs(deadline.deadline_date).format('h:mm A')}
											</Typography>
										</Box>

										{deadline.description && (
											<Typography variant="caption" fontSize={12} color="text.secondary">
												{deadline.description}
											</Typography>
										)}

										<Typography
											variant="caption"
											fontSize={12}
											color="primary.main"
											sx={{
												cursor: 'pointer',
												'&:hover': {
													textDecoration: 'underline',
												},
											}}
											onClick={() => handleClaimClick(deadline.claim_id)}
										>
											Claim #{deadline.claim_id}
										</Typography>
									</Stack>
								</Box>
							))}
						</Stack>
					)}
				</Box>
			</Fade>
		</Box>
	);
}

const styles = {
	container: {
		width: '100%',
		borderTop: `1px solid ${theme.palette.divider}`,
		paddingTop: 2,
		marginTop: 1,
	},
	scrollContainer: {
		maxHeight: 220,
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
	deadlineItem: {
		padding: '10px 12px',
		borderRadius: 1,
		backgroundColor: '#FAFAFA',
		border: `1px solid ${theme.palette.divider}`,
		transition: 'all 0.2s',
		'&:hover': {
			backgroundColor: theme.palette.action.selected,
			borderColor: theme.palette.primary.light,
		},
	},
	emptyState: {
		padding: 4,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 100,
	},
	icon: {
		fontSize: 16,
	},
};
