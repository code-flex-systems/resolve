'use client';

import { useState, useMemo } from 'react';
import Dropdown from '@/components/ui/Dropdown';
import { useDeadlineTrpc, Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import DeadlineListItem from '@/components/common/DeadlineListItem';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import dayjs from 'dayjs';
import { DeadlineStatus } from '@/config/enums';
import { IconCalendar } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';

type DeadlineFilter = 'all' | 'pending' | 'completed' | 'overdue';

export default function MyClaimsDeadlines() {
	const router = useRouter();
	const [filter, setFilter] = useState<DeadlineFilter>('all');
	const { data = { rows: [], count: 0 }, isLoading } = useDeadlineTrpc().listDeadlines(
		{ personalOnly: true },
		{ refetchOnMount: 'always' }
	);
	const deadlines = data.rows;

	const handleClaimClick = (claimId: string) => {
		router.push(`/my-claims/${claimId}`);
	};

	const handleFilterChange = (value: string | number) => {
		setFilter(value as DeadlineFilter);
	};

	// Calculate counts and filter deadlines
	const { counts, filteredDeadlines } = useMemo(() => {
		const now = dayjs();

		const isOverdue = (d: Deadline) =>
			d.status === DeadlineStatus.PENDING && dayjs(d.deadline_date).isBefore(now);
		const isPending = (d: Deadline) =>
			d.status === DeadlineStatus.PENDING && !dayjs(d.deadline_date).isBefore(now);
		const isCompleted = (d: Deadline) =>
			d.status === DeadlineStatus.MET || d.status === DeadlineStatus.MISSED;

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
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					padding: '12px 16px',
					fontSize: 13,
					fontWeight: 600,
					color: 'var(--text-primary)',
					backgroundColor: 'var(--bg-secondary)',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<IconCalendar size={16} style={{ marginRight: 8 }} />
				Related Deadlines
			</div>
			<div style={{ padding: 16 }}>
				{isLoading ? (
					<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
						<Skeleton variant="rect" height={40} />
						<Skeleton variant="rect" height={60} />
						<Skeleton variant="rect" height={60} />
					</div>
				) : (
					<>
						{/* Filter Dropdown */}
						<div style={{ marginBottom: 16, minWidth: 180 }}>
							<Dropdown
								options={[
									{ value: 'all', label: `All (${counts.all})` },
									{ value: 'pending', label: `Upcoming (${counts.pending})` },
									{ value: 'overdue', label: `Overdue (${counts.overdue})` },
									{ value: 'completed', label: `Completed (${counts.completed})` },
								]}
								value={filter}
								onChange={handleFilterChange}
								size="sm"
							/>
						</div>

						{/* Deadline List */}
						<div style={styles.scrollContainer}>
							{filteredDeadlines.length === 0 ? (
								<div style={styles.emptyState}>
									<span
										style={{
											fontSize: 13,
											color: 'text.secondary',
											textAlign: 'center' as const,
											fontStyle: 'italic',
										}}
									>
										{filter === 'all' ? 'No deadlines for your claims' : `No ${filter} deadlines`}
									</span>
								</div>
							) : (
								<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
									{filteredDeadlines.slice(0, 10).map((deadline) => (
										<DeadlineListItem
											key={deadline.id}
											deadline={deadline}
											onClaimClick={handleClaimClick}
											showTime={false}
											showDate={true}
										/>
									))}
								</div>
							)}
						</div>
						{filteredDeadlines.length > 10 && (
							<span
								style={{
									fontSize: 11,
									color: 'text.secondary',
									textAlign: 'center' as const,
									marginTop: 1,
								}}
							>
								Showing 10 of {filteredDeadlines.length} deadlines
							</span>
						)}
					</>
				)}
			</div>
		</Card>
	);
}

const styles = {
	container: {
		height: '100%',
		width: 300,
	},
	scrollContainer: {
		height: 'calc(100vh - 240px)',
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
		paddingRight: 8,
	},
	emptyState: {
		padding: 4,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 100,
	},
};
