import Card from '@/components/ui/Card';
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
	const cardPadding = isBreakdown ? 16 : 8;
	const cardLabelSize = isBreakdown ? 13 : 12;
	const cardValueSize = isBreakdown ? 24 : 16;
	const cardSubtextSize = isBreakdown ? 13 : 12;
	const spacing = isBreakdown ? 16 : 8;

	// Validate and format the busiest day date
	const busiestDayDate = maxEventsRow?.activity_date ? dayjs(maxEventsRow.activity_date) : null;
	const hasValidBusiestDay = busiestDayDate?.isValid() ?? false;

	return (
		<div style={{ display: 'flex', gap: spacing, marginBottom: isBreakdown ? 24 : 12, marginTop: isBreakdown ? 8 : 0 }}>
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: cardPadding }}>
					<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
						Total Events
					</span>
					<span style={{ fontSize: cardValueSize }}>
						{totalEvents.toLocaleString()}
					</span>
					<span style={{ fontSize: cardSubtextSize, color: 'var(--text-secondary)', maxWidth: 100 }}>
						{isBreakdown ? 'in selected range' : 'past 30 days'}
					</span>
				</div>
			</Card>
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: cardPadding }}>
					<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
						Avg Events a Day
					</span>
					<span style={{ fontSize: cardValueSize }}>
						{avgEvents.toLocaleString()}
					</span>
					<span style={{ fontSize: cardSubtextSize, color: 'var(--text-secondary)' }}>
						daily average
					</span>
				</div>
			</Card>
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: cardPadding }}>
					<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
						Busiest Day
					</span>
					<span style={{ fontSize: cardValueSize }}>
						{hasValidBusiestDay ? busiestDayDate!.format('MMM D') : '-'}
					</span>
					<span style={{ fontSize: cardSubtextSize, color: 'var(--text-secondary)' }}>
						{hasValidBusiestDay ? `${maxEventsRow!.event_count.toLocaleString()} events` : 'no data'}
					</span>
				</div>
			</Card>
		</div>
	);
}
