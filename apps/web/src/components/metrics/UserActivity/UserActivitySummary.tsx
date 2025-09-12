import MetricValue from '@/components/common/MetricValue';
import { Box, Typography } from '@mui/material';
import dayjs from 'dayjs';

export default function UserActivitySummary({
	totalEvents,
	avgEvents,
	maxEventsRow,
	maxUserRow,
}: {
	totalEvents: number;
	avgEvents: number;
	maxEventsRow: { activity_date: string; event_count: number } | null;
	maxUserRow?: { activity_date: string; active_users: number };
}) {
	return (
		<ul style={{ margin: '10px 20px', padding: '0px 20px 10px' }}>
			<li>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center">
					<MetricValue value={totalEvents.toLocaleString()} fontSize={14} />
					<Typography paddingLeft="5px" fontSize={14}>
						event(s) total
					</Typography>
				</Box>
			</li>
			<li>
				<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center" paddingTop="5px">
					<Typography paddingRight="5px" fontSize={14}>
						Avg.
					</Typography>
					<MetricValue value={avgEvents.toLocaleString()} fontSize={14} />
					<Typography paddingLeft="5px" fontSize={14}>
						event(s) a day
					</Typography>
				</Box>
			</li>
			{maxEventsRow && maxUserRow && (
				<li>
					<Box width="100%" display="flex" justifyContent="flex-start" alignItems="center" paddingTop="5px">
						<Typography fontSize={14} paddingRight="5px" noWrap>
							Busiest day -
						</Typography>
						<MetricValue value={dayjs(maxEventsRow.activity_date).format('MMMM D')} fontSize={14} />
					</Box>
					<ul style={{ margin: 0, padding: 0, marginLeft: '20px' }}>
						<li>
							<Box
								width="100%"
								display="flex"
								justifyContent="flex-start"
								alignItems="center"
								paddingTop="5px"
							>
								<MetricValue value={maxUserRow.active_users} fontSize={14} />
								<Typography fontSize={14} padding="0px 5px" noWrap>
									active user(s)
								</Typography>
							</Box>
						</li>
						<li>
							<Box
								width="100%"
								display="flex"
								justifyContent="flex-start"
								alignItems="center"
								paddingTop="5px"
							>
								<MetricValue value={maxEventsRow.event_count} fontSize={14} />
								<Typography fontSize={15} paddingLeft="5px" noWrap>
									event(s)
								</Typography>
							</Box>
						</li>
					</ul>
				</li>
			)}
		</ul>
	);
}
