'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { formatMDY } from '@/lib/utils/utils';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import ExpandableTitle from '@/components/common/ExpandableTitle';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import dayjs from 'dayjs';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import MetricValue from '@/components/common/MetricValue';
import UserActivitySummary from './UserActivitySummary';
import { IconBug, IconChartBar, IconInfoCircle } from '@tabler/icons-react';
import Skeleton from '@/components/ui/Skeleton';
import Divider from '@/components/ui/Divider';

const METRIC_WIDTH = 400;
const METRIC_HEIGHT = 300;

export default function UserActivityMetric() {
	const today = dayjs().endOf('day');
	const prev30 = today.subtract(30, 'day').startOf('day');
	const range: [string, string] = [prev30.toString(), today.toString()];
	const router = useRouter();
	const { data = [], isFetching } = useUserTrpc().activity({ filters: { range } });
	const { data: stats = { avg: 0, total: 0, maxRow: null }, isFetching: isFetchingStats } =
		useResponseTrpc().listLogStats({ filters: { range } }, { enabled: range.every((r) => !!r) });
	const formattedData = data.map((r) => ({ ...r, active_users: parseInt(r.active_users ?? '0') }));
	const chartData = formattedData.map((r) => ({
		name: r.activity_date,
		active_users: r.active_users,
	}));
	const maxUserRow = formattedData.find((u) => u.activity_date === stats.maxRow?.activity_date);

	return (
		<div style={styles.paper}>
			{isFetching ? (
				<Skeleton width={METRIC_WIDTH} height={METRIC_HEIGHT} />
			) : (
				<div style={{ display: 'flex', flexDirection: 'column' as const, width: METRIC_WIDTH, height: METRIC_HEIGHT, padding: '10px' }}>
					<div
style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'flex-start', position: 'relative' as const }}>
						<div
style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px' }}>
							<span style={{ fontSize: 14, fontWeight: 600 }}>
								User Activity
							</span>
							<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
								<div style={{ marginRight: '15px' }}>
									<span style={{ fontSize: 13, color: '#d9d9d9' }}>
										past 30 days
									</span>
								</div>
								<div style={{ marginRight: '5px' }}>
									<BasicButtonStyled
										buttonProps={{}}
										icon={<IconInfoCircle size={20} />}
										tooltipProps={{
											title: 'Engagement is measured by the number of users generating activity logs for a given day.',
										}}
									/>
								</div>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => router.push('/admin/user-management/activity'),
										sx: { marginLeft: '5px' },
									}}
									icon={
										<IconBug
										 style={{
												transform: 'scaleX(-1)',
												color: 'var(--text-accent)',
											}}
										/>
									}
									tooltipProps={{ title: 'Open in Inspector' }}
								/>
							</div>
						</div>
						<div
style={{ width: 'calc(100% - 30xp)', display: 'flex', justifyContent: 'center', alignItems: chartData.length ? 'flex-end' : 'center', height: 120, marginTop: '20px' }}>
							{chartData.length ? (
								<ResponsiveContainer width={375} height={120}>
									<BarChart data={chartData} margin={{ left: 0, right: 0, top: 0, bottom: 0 }}>
										<XAxis dataKey="name" hide />
										<YAxis hide allowDecimals={false} />
										<Tooltip
											formatter={(value: any) => [value, 'Active users']}
											labelFormatter={(label) => formatMDY(label as string)}
										/>
										<Bar
											dataKey="active_users"
											fill="var(--text-accent)"
											radius={[10, 10, 0, 0]}
										/>
									</BarChart>
								</ResponsiveContainer>
							) : (
								<span style={{ fontSize: 13 }}>No activity</span>
							)}
						</div>
						<div style={styles.paperInner}>
							<div
style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
								<UserActivitySummary
									totalEvents={stats.total}
									avgEvents={stats.avg}
									maxEventsRow={stats.maxRow}
								/>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

const styles = {
	paper: {
		borderRadius: 3,
		margin: '15px',
		width: METRIC_WIDTH,
		height: METRIC_HEIGHT,
	},
	paperInner: {
		position: 'absolute' as const,
		zIndex: 100,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'column' as const,
		width: 375,
		height: 120,
		bottom: 0,
		borderTopLeftRadius: 0,
		borderTopRightRadius: 0,
		borderRadius: 3,
		borderTop: `1px solid ${'var(--text-accent)'}`,
	},
	skeleton: {
		borderRadius: 3,
	},
};
