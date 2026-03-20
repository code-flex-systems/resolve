import { Card, CardContent, Grid } from '@mui/material';
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
	const cardPadding = isBreakdown ? 2 : 1;
	const cardLabelSize = isBreakdown ? 13 : 12;
	const cardValueSize = isBreakdown ? 24 : 16;
	const cardSubtextSize = isBreakdown ? 13 : 12;
	const spacing = isBreakdown ? 2 : 1;

	// Validate and format the busiest day date
	const busiestDayDate = maxEventsRow?.activity_date ? dayjs(maxEventsRow.activity_date) : null;
	const hasValidBusiestDay = busiestDayDate?.isValid() ?? false;

	return (
		<Grid container spacing={spacing} mb={isBreakdown ? 3 : 1.5} mt={isBreakdown ? 1 : 0}>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
							Total Events
						</span>
						<span style={{ fontSize: cardValueSize }}>
							{totalEvents.toLocaleString()}
						</span>
						<span style={{ fontSize: cardSubtextSize, color: 'text.secondary', maxWidth: 100 }}>
							{isBreakdown ? 'in selected range' : 'past 30 days'}
						</span>
					</CardContent>
				</Card>
			</Grid>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
							Avg Events a Day
						</span>
						<span style={{ fontSize: cardValueSize }}>
							{avgEvents.toLocaleString()}
						</span>
						<span style={{ fontSize: cardSubtextSize, color: 'text.secondary' }}>
							daily average
						</span>
					</CardContent>
				</Card>
			</Grid>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<span style={{ color: '#d9d9d9', fontSize: cardLabelSize }}>
							Busiest Day
						</span>
						<span style={{ fontSize: cardValueSize }}>
							{hasValidBusiestDay ? busiestDayDate!.format('MMM D') : '-'}
						</span>
						<span style={{ fontSize: cardSubtextSize, color: 'text.secondary' }}>
							{hasValidBusiestDay ? `${maxEventsRow!.event_count.toLocaleString()} events` : 'no data'}
						</span>
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
}
