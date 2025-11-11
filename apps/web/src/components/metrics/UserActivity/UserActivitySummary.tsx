import { Card, CardContent, Grid, Typography } from '@mui/material';
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

	return (
		<Grid container spacing={spacing} mb={isBreakdown ? 3 : 1.5} mt={isBreakdown ? 1 : 0}>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<Typography color="#d9d9d9" fontSize={cardLabelSize} gutterBottom>
							Total Events
						</Typography>
						<Typography variant={isBreakdown ? 'h5' : 'h6'} fontSize={cardValueSize} component="div">
							{totalEvents.toLocaleString()}
						</Typography>
						<Typography variant="body2" fontSize={cardSubtextSize} color="text.secondary" maxWidth={100}>
							{isBreakdown ? 'in selected range' : 'past 30 days'}
						</Typography>
					</CardContent>
				</Card>
			</Grid>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<Typography color="#d9d9d9" fontSize={cardLabelSize} gutterBottom>
							Avg Events a Day
						</Typography>
						<Typography variant={isBreakdown ? 'h5' : 'h6'} fontSize={cardValueSize} component="div">
							{avgEvents.toLocaleString()}
						</Typography>
						<Typography variant="body2" fontSize={cardSubtextSize} color="text.secondary">
							daily average
						</Typography>
					</CardContent>
				</Card>
			</Grid>
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: cardPadding, '&:last-child': { pb: cardPadding } }}>
						<Typography color="#d9d9d9" fontSize={cardLabelSize} gutterBottom>
							Busiest Day
						</Typography>
						<Typography variant={isBreakdown ? 'h5' : 'h6'} fontSize={cardValueSize} component="div">
							{maxEventsRow ? dayjs(maxEventsRow.activity_date).format('MMM D') : '-'}
						</Typography>
						<Typography variant="body2" fontSize={cardSubtextSize} color="text.secondary">
							{maxEventsRow ? `${maxEventsRow.event_count.toLocaleString()} events` : 'no data'}
						</Typography>
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
}
