'use client';

import { Badge, Paper } from '@mui/material';
import { DateCalendar, PickersDay, PickersDayProps } from '@mui/x-date-pickers-pro';
import { Deadline, useDeadlineTrpc } from '@/hooks/trpc/useDeadlineTrpc';
import { useMemo, useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import theme from '@/styles/theme';
import DailyEventsList from './DailyEventsList';

export default function Calendar() {
	const [currentMonth, setCurrentMonth] = useState<Dayjs>(dayjs());
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(dayjs()); // Default to today

	// Set today as selected date on mount
	useEffect(() => {
		setSelectedDate(dayjs());
	}, []);

	// Fetch deadlines for the current month range
	const dateRange = useMemo(() => {
		const start = currentMonth.startOf('month').toISOString();
		const end = currentMonth.endOf('month').toISOString();
		return [start, end] as [string, string];
	}, [currentMonth]);

	const { data = { rows: [], count: 0 } } = useDeadlineTrpc().listDeadlines(
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
		data.rows.forEach((deadline) => {
			const dateKey = dayjs(deadline.deadline_date).format('YYYY-MM-DD');
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(deadline);
		});
		return grouped;
	}, [data]);

	// Custom day renderer with badge
	function CustomDay(props: PickersDayProps) {
		const { day, ...other } = props;
		const dateKey = day.format('YYYY-MM-DD');
		const dayDeadlines = deadlinesByDay.get(dateKey);
		const hasDeadlines = dayDeadlines && dayDeadlines.length > 0;
		const isSelected = selectedDate && day.isSame(selectedDate, 'day');

		return (
			<Badge
				key={day.toString()}
				overlap="circular"
				badgeContent={hasDeadlines ? dayDeadlines.length : undefined}
				sx={{
					bottom: -10,
					'& .MuiBadge-badge': {
						fontSize: 10,
						height: 16,
						minWidth: 16,
						backgroundColor: theme.palette.error.light,
						color: 'white',
					},
				}}
			>
				<PickersDay
					{...other}
					day={day}
					selected={Boolean(isSelected)}
					onClick={(e) => {
						e.stopPropagation();
						e.preventDefault();
						setSelectedDate(day);
					}}
					sx={{
						cursor: 'pointer',
						'&:hover': {
							backgroundColor: theme.palette.action.hover,
						},
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
		<Paper elevation={0} sx={styles.container}>
			<DateCalendar
				value={selectedDate || currentMonth}
				onChange={(newValue) => {
					if (newValue) {
						setCurrentMonth(newValue);
						setSelectedDate(newValue);
					}
				}}
				onMonthChange={(newMonth) => {
					setCurrentMonth(newMonth);
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

			{/* Daily Events List */}
			<DailyEventsList deadlines={selectedDeadlines} selectedDate={selectedDate} />
		</Paper>
	);
}

const styles = {
	container: {
		width: 450,
		minWidth: 450,
		height: 600,
		padding: '12px 24px 24px 24px',
		borderRadius: 4,
		margin: '15px',
		display: 'flex',
		flexDirection: 'column',
	},
};
