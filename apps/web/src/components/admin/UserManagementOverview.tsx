'use client';

import CardioLoadingIndicator from '@/components/common/CardioLoadingIndicator';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import { IconUsers, IconUserPlus, IconShield } from '@tabler/icons-react';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';

export default function UserManagementOverview() {
	const { data, isLoading } = useUserTrpc().managementStats(undefined);
	const activityFilters = useMemo(
		() => ({
			filters: {
				range: [
					dayjs().subtract(90, 'day').startOf('day').toISOString(),
					dayjs().endOf('day').toISOString(),
				] as [string, string],
			},
		}),
		[]
	);
	const { data: activityData } = useUserTrpc().activity(activityFilters);

	if (isLoading || !data) {
		return <CardioLoadingIndicator message="Loading user data..." />;
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

			{/* Login Activity */}
			<Card variant="beveled" padding="md" style={{ maxWidth: 1000 }}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
						User Logins (90 days)
					</span>
					{activityData && activityData.length > 0 ? (
						<ResponsiveContainer width="100%" height={200}>
							<BarChart
								data={activityData.map((d) => ({
									date: dayjs(d.activity_date).format('MMM D'),
									users: Number(d.active_users),
								}))}
								margin={{ left: 0, right: 10, top: 10, bottom: 10 }}
							>
								<XAxis
									dataKey="date"
									fontSize={11}
									tick={{ fill: 'var(--text-muted)' }}
									tickLine={false}
									axisLine={false}
									interval={6}
								/>
								<YAxis
									fontSize={11}
									tick={{ fill: 'var(--text-muted)' }}
									tickLine={false}
									axisLine={false}
									allowDecimals={false}
								/>
								<Tooltip
									contentStyle={{
										fontSize: 12,
										borderRadius: 8,
										border: '1px solid var(--border-primary, #333)',
										background: 'var(--bg-secondary, #1e1e1e)',
										color: 'var(--text-primary, #e0e0e0)',
									}}
									formatter={(value: any) => [value, 'Unique logins']}
								/>
								<Bar dataKey="users" fill="#4fc3f7" radius={[2, 2, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					) : (
						<span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '20px 0' }}>
							No login data available
						</span>
					)}
				</div>
			</Card>
		</div>
	);
}
