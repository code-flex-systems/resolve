'use client';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatMD } from '@/lib/utils/utils';
import dayjs, { Dayjs } from 'dayjs';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import type { DateRange } from '@/types/dateTypes';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { useMemo } from 'react';
import UserActivitySummary from './UserActivitySummary';
import Skeleton from '@/components/ui/Skeleton';
import Card from '@/components/ui/Card';

export default function UserActivityChart({
	users,
	range,
}: {
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
}) {
	const today = dayjs().format('MM/DD/YYYY');

	const checklistFilters = useMemo(
		() => ({
			filters: {
				range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
				users: users.length > 0 ? users.map((u) => u.id) : undefined,
			},
		}),
		[range, users]
	);

	const enabled = range.every((r) => !!r);
	const { data: checklistData = [], isFetching: fetchingChecklist } = useResponseTrpc().checklistActivity(
		checklistFilters,
		{ enabled }
	);
	const { data: stats = { avg: 0, total: 0, maxRow: null }, isFetching: fetchingStats } =
		useResponseTrpc().listLogStats(checklistFilters, { enabled });

	const isLoading = fetchingChecklist || fetchingStats;

	const checklistChartData = checklistData.map((r) => ({
		name: r.activity_date,
		event_count: r.event_count,
	}));

	const maxY = Math.max(...checklistChartData.map((d) => d.event_count), 1);

	return (
		<Card variant="beveled" padding="lg" style={{ width: '100%' }}>
			<div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
				<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
					Checklist Activity
				</span>

				{isLoading ? (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16 }}>
						<div style={{ display: 'flex', gap: 16 }}>
							<Skeleton variant="rect" width="33%" height={80} />
							<Skeleton variant="rect" width="33%" height={80} />
							<Skeleton variant="rect" width="33%" height={80} />
						</div>
						<Skeleton variant="rect" width="100%" height={300} />
					</div>
				) : (
					<>
						<UserActivitySummary
							totalEvents={stats.total}
							avgEvents={stats.avg}
							maxEventsRow={stats.maxRow}
							isBreakdown={true}
						/>
						<div style={{ width: '100%', height: 350, padding: '10px 0' }}>
							<ResponsiveContainer width="100%" height="100%">
								<BarChart data={checklistChartData} margin={{ left: 0, right: 30, top: 10, bottom: 10 }}>
									<XAxis
										dataKey="name"
										tickFormatter={(v) => formatMD(v)}
										tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
										stroke="var(--border)"
										angle={45}
										textAnchor="start"
										height={50}
									/>
									<YAxis
										domain={[0, Math.ceil(maxY / 10) * 10 || 10]}
										allowDecimals={false}
										tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
										stroke="var(--border)"
									/>
									<Tooltip
										contentStyle={{
											background: 'var(--bg-secondary, #1e1e1e)',
											border: '1px solid var(--border-primary, #333)',
											borderRadius: 8,
											color: 'var(--text-primary, #e0e0e0)',
										}}
										formatter={(value: any) => [value, 'Response events']}
										labelFormatter={(label) => formatMD(label as string)}
									/>
									<Bar dataKey="event_count" fill="var(--text-accent)" radius={[3, 3, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					</>
				)}
			</div>
		</Card>
	);
}
