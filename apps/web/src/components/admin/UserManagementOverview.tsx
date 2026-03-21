'use client';

import { Spinner } from '@/components/ui/Progress';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import dayjs from 'dayjs';
import { IconUsers, IconUserPlus, IconShield } from '@tabler/icons-react';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';

export default function UserManagementOverview() {
	const { data, isLoading } = useUserTrpc().managementStats(undefined);
	const thirtyDaysAgo = dayjs().subtract(30, 'day').toISOString();
	const today = new Date().toISOString();
	const { data: activityData } = useUserTrpc().activity({ filters: { range: [thirtyDaysAgo, today] } });

	if (isLoading || !data) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
				<Spinner size="lg" />
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					User Management
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Overview of user accounts, roles, and recent activity.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconUsers size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={data.total}
					label="Total Users"
					subtitle={`${data.active} active \u00b7 ${data.disabled} disabled`}
				/>
				<KpiCard
					icon={<IconUserPlus size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={data.recentSignups}
					label="Recent Sign-ups"
					subtitle="Last 30 days"
				/>
			</div>

			{data.byRole.length > 0 && (
				<>
					<h6 style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-secondary)' }}>
						Users by Role
					</h6>
					<div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
						{data.byRole.map((r) => (
							<KpiCard
								key={r.role}
								icon={<IconShield size={16} />}
								iconColor="var(--text-secondary)"
								iconBgColor="var(--bg-tertiary)"
								value={r.count}
								label={r.role}
								size="sm"
							/>
						))}
					</div>
				</>
			)}

			{/* Activity Trend */}
			<Card variant="beveled" padding="md">
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
						Daily Active Users (30 days)
					</span>
					{activityData && activityData.length > 0 ? (
						<ResponsiveContainer width="100%" height={160}>
							<AreaChart data={activityData.map(d => ({ date: dayjs(d.activity_date).format('MMM D'), users: Number(d.active_users) }))}>
								<defs>
									<linearGradient id="activeUsersGradient" x1="0" y1="0" x2="0" y2="1">
										<stop offset="0%" stopColor="var(--text-accent)" stopOpacity={0.15} />
										<stop offset="100%" stopColor="var(--text-accent)" stopOpacity={0} />
									</linearGradient>
								</defs>
								<XAxis dataKey="date" fontSize={11} tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} />
								<YAxis fontSize={11} tick={{ fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
								<Tooltip contentStyle={{ fontSize: 12, borderRadius: 6, border: '1px solid var(--border-primary)', background: 'var(--bg-primary)' }} />
								<Area type="monotone" dataKey="users" stroke="var(--text-accent)" strokeWidth={2} fill="url(#activeUsersGradient)" />
							</AreaChart>
						</ResponsiveContainer>
					) : (
						<span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>No activity data available</span>
					)}
				</div>
			</Card>
		</div>
	);
}
