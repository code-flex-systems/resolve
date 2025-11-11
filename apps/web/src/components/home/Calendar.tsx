'use client';

import { Badge, Box, Paper, Stack, Typography } from '@mui/material';
import { DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers-pro';
import { useRecoveryTrpc, Deadline } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import BasicPopper from '../common/BasicPopper';
import { PopperProps } from '@mui/material';
import theme from '@/styles/theme';
import { DeadlineStatus } from '@/config/enums';
import HourglassBottomIcon from '@mui/icons-material/HourglassBottom';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

/**
 * Get emoji for deadline status
 */
function getDeadlineStatusIcon(status: string) {
	switch (status) {
		case DeadlineStatus.PENDING:
			return <HourglassBottomIcon sx={{ ...styles.icon, color: theme.palette.info.main }} />;
		case DeadlineStatus.MET:
			return <CheckCircleIcon sx={{ ...styles.icon, color: theme.palette.success.main }} />;
		case DeadlineStatus.MISSED:
			return <CancelIcon sx={{ ...styles.icon, color: theme.palette.error.main }} />;
		case DeadlineStatus.EXTENDED:
			return <CalendarMonthIcon sx={{ ...styles.icon, color: theme.palette.warning.main }} />;
		default:
			return <></>;
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

export default function Calendar() {
	const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
	const [anchorEl, setAnchorEl] = useState<PopperProps['anchorEl']>();
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

	// Fetch deadlines for the current month range
	const dateRange = useMemo(() => {
		const start = currentMonth.startOf('month').toISOString();
		const end = currentMonth.endOf('month').toISOString();
		return [start, end] as [string, string];
	}, [currentMonth]);

	const { data: deadlines = [] } = useRecoveryTrpc().listDeadlines(
		{
			dateRange,
			personalOnly: true, // Only show deadlines for claims the user is assigned to
			// Show all deadline statuses
		},
		{ enabled: true }
	);

	// Group deadlines by day
	const deadlinesByDay = useMemo(() => {
		const grouped = new Map<string, Deadline[]>();
		deadlines.forEach((deadline) => {
			const dateKey = dayjs(deadline.deadline_date).format('YYYY-MM-DD');
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(deadline);
		});
		return grouped;
	}, [deadlines]);

	// Custom day renderer with badge
	function CustomDay(props: PickersDayProps) {
		const { day, ...other } = props;
		const dateKey = day.format('YYYY-MM-DD');
		const dayDeadlines = deadlinesByDay.get(dateKey);
		const hasDeadlines = dayDeadlines && dayDeadlines.length > 0;

		return (
			<Badge
				key={day.toString()}
				overlap="circular"
				badgeContent={hasDeadlines ? dayDeadlines.length : undefined}
				color="error"
				sx={{
					bottom: -10,
					'& .MuiBadge-badge': {
						fontSize: 10,
						height: 16,
						minWidth: 16,
					},
				}}
			>
				<PickersDay
					{...other}
					day={day}
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						if (hasDeadlines) {
							setSelectedDate(day);
							// If popper is already open, keep the same anchor, just update the date
							// Otherwise, set new anchor to open the popper
							if (!anchorEl) {
								setAnchorEl(e.currentTarget);
							}
						}
					}}
					sx={{
						cursor: hasDeadlines ? 'pointer' : 'default',
						'&:hover': hasDeadlines
							? {
									backgroundColor: theme.palette.action.hover,
								}
							: undefined,
					}}
				/>
			</Badge>
		);
	}

	// Get deadlines for selected date
	const selectedDeadlines = useMemo(() => {
		if (!selectedDate) return [];
		const dateKey = selectedDate.format('YYYY-MM-DD');
		return deadlinesByDay.get(dateKey) || [];
	}, [selectedDate, deadlinesByDay]);

	return (
		<>
			<Paper elevation={0} sx={styles.container}>
				<DateCalendar
					value={currentMonth}
					onChange={(newValue) => {
						if (newValue) {
							setCurrentMonth(newValue);
						}
					}}
					sx={{
						'& .MuiDayCalendar-monthContainer': {
							overflow: 'unset',
						},
					}}
					slots={{
						day: CustomDay,
					}}
				/>
			</Paper>

			{/* Deadline Details Popper */}
			{!!anchorEl && (
				<BasicPopper
					anchorEl={anchorEl}
					setAnchorEl={(newAnchor) => {
						setAnchorEl(newAnchor);
						if (!newAnchor) {
							setSelectedDate(null);
						}
					}}
					placement="right-start"
				>
					<Paper sx={styles.popper}>
						<Stack spacing={1}>
							<Typography variant="subtitle2" fontWeight={600} fontSize={14}>
								{selectedDate?.format('MMMM D, YYYY')}
							</Typography>
							<Box height="calc(100vh - 55px)" overflow="auto">
								{selectedDeadlines.map((deadline) => (
									<Box key={deadline.id} sx={styles.deadlineItem}>
										<Stack spacing={0.5}>
											<Box
												width="100%"
												display="flex"
												justifyContent="space-between"
												alignItems="center"
												gap={0.5}
											>
												<Box display="flex" alignItems="center">
													{getDeadlineStatusIcon(deadline.status)}
													<Typography
														variant="body2"
														fontWeight={600}
														fontSize={13}
														marginLeft="5px"
													>
														{formatDeadlineType(deadline.deadline_type)}
													</Typography>
												</Box>
												<Typography fontSize={12}>
													{dayjs(deadline.deadline_date).format('hh:mm A')}
												</Typography>
											</Box>
											{deadline.description && (
												<Typography variant="caption" fontSize={13} color="text.secondary">
													{deadline.description}
												</Typography>
											)}
											<Typography variant="caption" fontSize={12} color="text.secondary">
												Claim #{deadline.claim_id}
											</Typography>
										</Stack>
									</Box>
								))}
							</Box>
						</Stack>
					</Paper>
				</BasicPopper>
			)}
		</>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 350,
		padding: '10px 20px',
		// overflow: 'hidden',
		borderRadius: 4,
		margin: '15px',
	},
	icon: {
		fontSize: 15,
	},
	popper: {
		bgcolor: 'rgba(255, 255, 255, 0.95)',
		padding: '12px',
		minWidth: 400,
		maxWidth: 450,
		outline: 1,
		outlineColor: theme.palette.divider,
	},
	deadlineItem: {
		padding: '8px',
		borderRadius: 1,
		marginBottom: '8px',
		backgroundColor: theme.palette.action.hover,
		'&:last-child': {
			marginBottom: 0,
		},
	},
};
