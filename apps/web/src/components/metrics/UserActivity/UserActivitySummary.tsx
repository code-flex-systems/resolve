import KpiCard from '@/components/ui/KpiCard';
import dayjs from 'dayjs';

export default function UserActivitySummary({
	totalEvents,
	avgEvents,
	maxEventsRow,
	isBreakdown = false,
}: {
	totalEvents: number;
	avgEvents: number;
	maxEventsRow: { activity_date: string; event_count: number } | null;
	isBreakdown?: boolean;
}) {
	const busiestDayDate = maxEventsRow?.activity_date ? dayjs(maxEventsRow.activity_date) : null;
	const hasValidBusiestDay = busiestDayDate?.isValid() ?? false;

	return (
		<div style={{ display: 'flex', gap: isBreakdown ? 16 : 8, marginBottom: isBreakdown ? 24 : 12, marginTop: isBreakdown ? 8 : 0 }}>
			<KpiCard size="sm"
				value={totalEvents.toLocaleString()}
				label="Total Events"
				subtitle={isBreakdown ? 'in selected range' : 'past 30 days'}
			/>
			<KpiCard size="sm"
				value={avgEvents.toLocaleString()}
				label="Avg Events a Day"
				subtitle="daily average"
			/>
			<KpiCard size="sm"
				value={hasValidBusiestDay ? busiestDayDate!.format('MMM D') : '-'}
				label="Busiest Day"
				subtitle={hasValidBusiestDay ? `${maxEventsRow!.event_count.toLocaleString()} events` : 'no data'}
			/>
		</div>
	);
}
