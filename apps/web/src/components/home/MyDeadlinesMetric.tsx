'use client';

import Badge from '@/components/ui/Badge';
import { IconCalendar } from '@tabler/icons-react';
import { Deadline, useDeadlineTrpc } from '@/hooks/trpc/useDeadlineTrpc';
import { DeadlineStatus } from '@/config/enums';
import Card from '@/components/ui/Card';
import { useMemo, useState, useEffect } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import DailyEventsList from './DailyEventsList';
import { IconAlertTriangle, IconClock } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';

export default function MyDeadlinesMetric() {
	// Calendar state
	const [currentMonth, setCurrentMonth] = useState<Dayjs | null>(null);
	const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

	// Set today as selected date on mount (client-side only)
	useEffect(() => {
		const today = dayjs();
		setCurrentMonth(today);
		setSelectedDate(today);
	}, []);

	// Fetch deadlines for the current month range (for calendar badges and daily list)
	const monthDateRange = useMemo(() => {
		if (!currentMonth) return null;
		const start = currentMonth.startOf('month').toISOString();
		const end = currentMonth.endOf('month').toISOString();
		return [start, end] as [string, string];
	}, [currentMonth]);

	const { data: monthData = { rows: [], count: 0 }, isLoading: monthLoading } =
		useDeadlineTrpc().listDeadlines(
			{
				dateRange: monthDateRange!,
				personalOnly: true,
			},
			{ enabled: !!monthDateRange }
		);

	// Separate query for overdue deadlines (unbounded by month)
	// Fetches all pending deadlines from the past to ensure overdue items remain visible
	const overdueDateRange = useMemo(() => {
		// Query from a year ago to yesterday (captures all overdue)
		const start = dayjs().subtract(1, 'year').startOf('day').toISOString();
		const end = dayjs().subtract(1, 'day').endOf('day').toISOString();
		return [start, end] as [string, string];
	}, []);

	const { data: overdueData = { rows: [], count: 0 }, isLoading: overdueLoading } =
		useDeadlineTrpc().listDeadlines(
			{
				dateRange: overdueDateRange,
				personalOnly: true,
				status: DeadlineStatus.PENDING,
			},
			{ enabled: true }
		);

	const isLoading = monthLoading || overdueLoading;

	// Calculate overdue count from dedicated overdue query
	const overdueCount = overdueData.rows.length;

	// Calculate upcoming count from month data (next 7 days from today)
	const upcomingCount = useMemo(() => {
		const today = dayjs().startOf('day');
		const nextWeek = today.add(7, 'days');

		let upcoming = 0;

		monthData.rows.forEach((deadline) => {
			const deadlineDate = dayjs(deadline.deadline_date).startOf('day');

			if (
				deadlineDate.valueOf()>= today.valueOf() &&
				deadlineDate.valueOf() < nextWeek.valueOf() &&
				deadline.status === DeadlineStatus.PENDING
			) {
				upcoming++;
			}
		});

		return upcoming;
	}, [monthData]);

	// Group deadlines by day for calendar badges
	const deadlinesByDay = useMemo(() => {
		const grouped = new Map<string, Deadline[]>();
		monthData.rows.forEach((deadline) => {
			const dateKey = dayjs(deadline.deadline_date).format('YYYY-MM-DD');
			if (!grouped.has(dateKey)) {
				grouped.set(dateKey, []);
			}
			grouped.get(dateKey)!.push(deadline);
		});
		return grouped;
	}, [monthData]);

	// Dates that have deadlines (for modifiers)
	const deadlineDates = useMemo(() => {
		return Array.from(deadlinesByDay.keys()).map((key) => new Date(key + 'T00:00:00'));
	}, [deadlinesByDay]);

	// Get deadlines for selected date
	const selectedDeadlines = useMemo(() => {
		if (!selectedDate) return [];
		const dateKey = selectedDate.format('YYYY-MM-DD');
		return deadlinesByDay.get(dateKey) || [];
	}, [selectedDate, deadlinesByDay]);

	return (
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
			<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
				<IconCalendar size={16} style={{ marginRight: 8 }} />
				My Deadlines
			</div>
			<div style={{ ...styles.contentContainer, padding: 16 }}>
				{isLoading ? (
					<Skeleton variant="rect" width="100%" height="100%" />
				) : (
					<>
						{/* Overdue/Upcoming Stats */}
						<Card variant="beveled" padding="none" style={styles.statsContainer}>
							{/* Overdue */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<div
style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
									<IconAlertTriangle size={20} style={{ color: 'white', fontSize: 22 }} />
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' as const }}>
									<span style={{ fontSize: 24, fontWeight: 700, color: 'error' }}>
										{overdueCount}
									</span>
									<span style={{ fontSize: 11 }}>
										Overdue
									</span>
								</div>
							</div>

							{/* Upcoming */}
							<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
								<div
style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40 }}>
									<IconClock size={20} style={{ color: 'white', fontSize: 22 }} />
								</div>
								<div style={{ display: 'flex', flexDirection: 'column' as const }}>
									<span style={{ fontSize: 24, fontWeight: 700, color: 'warning.main' }}>
										{upcomingCount}
									</span>
									<span style={{ color: 'text.secondary', fontSize: 11 }}>
										Next 7 Days
									</span>
								</div>
							</div>
						</Card>

						{/* Calendar */}
						<DayPicker
							mode="single"
							selected={selectedDate?.toDate() ?? undefined}
							onSelect={(date) => {
								if (date) {
									const d = dayjs(date);
									setCurrentMonth(d);
									setSelectedDate(d);
								}
							}}
							onMonthChange={(month) => {
								setCurrentMonth(dayjs(month));
							}}
							month={currentMonth?.toDate() ?? undefined}
							modifiers={{ hasDeadline: deadlineDates }}
							modifiersStyles={{ hasDeadline: { fontWeight: 'bold', backgroundColor: 'var(--status-info-bg)' } }}
						/>

						{/* Daily Events List - fills remaining space */}
						<DailyEventsList deadlines={selectedDeadlines} selectedDate={selectedDate} flexGrow />
					</>
				)}
			</div>
		</Card>
	);
}

const styles = {
	container: {
		width: 450,
		minWidth: 450,
		height: 'calc(100vh - 140px)',
		margin: '15px',
	},
	contentContainer: {
		display: 'flex',
		flexDirection: 'column' as const,
		height: 'calc(100% - 45px)',
		overflow: 'hidden' as const,
	},
	statsContainer: {
		display: 'flex',
		gap: 3,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 1.5,
		background: 'linear-gradient(135deg, rgba(255, 152, 0, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
		borderRadius: 1,
		marginBottom: 1,
	},
};
