'use client';

import KpiCard from '@/components/ui/KpiCard';
import Skeleton from '@/components/ui/Skeleton';
import { IconSubtask, IconAlertTriangle, IconClock } from '@tabler/icons-react';

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
	if (isLoading) {
		return (
			<div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
				<Skeleton variant="rect" width="33%" height={80} />
				<Skeleton variant="rect" width="33%" height={80} />
				<Skeleton variant="rect" width="33%" height={80} />
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
			<KpiCard
				icon={<IconSubtask size={16} />}
				iconColor="var(--text-accent)"
				iconBgColor="var(--status-info-bg)"
				value={openTasks}
				label="Open Tasks"
				subtitle="pending + in progress"
				size="sm"
			/>
			<KpiCard
				icon={<IconAlertTriangle size={16} />}
				iconColor={overdueTasks > 0 ? 'var(--status-error)' : 'var(--text-secondary)'}
				iconBgColor={overdueTasks > 0 ? 'var(--status-error-bg)' : 'var(--bg-tertiary)'}
				value={overdueTasks}
				label="Overdue"
				subtitle="past due date"
				subtitleColor={overdueTasks > 0 ? 'negative' : 'default'}
				size="sm"
			/>
			<KpiCard
				icon={<IconClock size={16} />}
				iconColor="var(--text-secondary)"
				iconBgColor="var(--bg-tertiary)"
				value={avgCompletionDays !== null ? `${avgCompletionDays.toFixed(1)} days` : '-'}
				label="Avg Completion"
				subtitle="create to complete"
				size="sm"
			/>
		</div>
	);
}
