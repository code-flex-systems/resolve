'use client';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';


interface TaskMetricsProps {
	openTasks: number;
	overdueTasks: number;
	avgCompletionDays: number | null;
	isLoading?: boolean;
}

export default function TaskMetrics({
	openTasks,
	overdueTasks,
	avgCompletionDays,
	isLoading,
}: TaskMetricsProps) {
	return (
		<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
			{/* Open Tasks */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
					<span style={{ color: '#d9d9d9', fontSize: 12 }}>
						Open Tasks
					</span>
					{isLoading ? (
						<>
							<Skeleton variant="text" width={40} height={24} />
							<Skeleton variant="text" width={80} height={16} />
						</>
					) : (
						<>
							<span style={{ fontSize: 16 }}>
								{openTasks}
							</span>
							<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
								pending + in progress
							</span>
						</>
					)}
				</div>
			</Card>

			{/* Overdue Tasks */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
					<span style={{ color: '#d9d9d9', fontSize: 12 }}>
						Overdue
					</span>
					{isLoading ? (
						<>
							<Skeleton variant="text" width={40} height={24} />
							<Skeleton variant="text" width={70} height={16} />
						</>
					) : (
						<>
							<span
								style={{ fontSize: 16, color: overdueTasks > 0 ? 'var(--status-error)' : 'inherit' }}
							>
								{overdueTasks}
							</span>
							<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
								past due date
							</span>
						</>
					)}
				</div>
			</Card>

			{/* Average Completion Time */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
					<span style={{ color: '#d9d9d9', fontSize: 12 }}>
						Avg Completion
					</span>
					{isLoading ? (
						<>
							<Skeleton variant="text" width={60} height={24} />
							<Skeleton variant="text" width={90} height={16} />
						</>
					) : (
						<>
							<span style={{ fontSize: 16 }}>
								{avgCompletionDays !== null ? `${avgCompletionDays.toFixed(1)} days` : '-'}
							</span>
							<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
								create to complete
							</span>
						</>
					)}
				</div>
			</Card>
		</div>
	);
}
