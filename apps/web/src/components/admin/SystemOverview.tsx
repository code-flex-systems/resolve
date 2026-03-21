'use client';

import { Spinner } from '@/components/ui/Progress';
import KpiCard from '@/components/ui/KpiCard';
import Card from '@/components/ui/Card';
import { IconActivity, IconDatabase, IconScale } from '@tabler/icons-react';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export default function SystemOverview() {
	const { data, isLoading } = useAdminLogsTrpc().getSystemStats(undefined);
	const { data: logsData } = useAdminLogsTrpc().listConfigLogs({ limit: 10 });

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
					System
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					System activity, reference data, and configuration overview.
				</span>
			</div>

			<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
				<KpiCard
					icon={<IconActivity size={20} />}
					iconColor="var(--text-accent)"
					iconBgColor="var(--status-info-bg)"
					value={data.adminActionsToday}
					label="Admin Actions Today"
					subtitle="Configuration changes today"
				/>
				<KpiCard
					icon={<IconDatabase size={20} />}
					iconColor="var(--status-success)"
					iconBgColor="var(--status-success-bg)"
					value={data.referenceDataEntities}
					label="Reference Data Lists"
					subtitle="Active entity types"
				/>
				<KpiCard
					icon={<IconScale size={20} />}
					iconColor="#8b5cf6"
					iconBgColor="rgba(139, 92, 246, 0.1)"
					value={data.activeStatuteRules}
					label="Statute Rules"
					subtitle="Jurisdiction rules configured"
				/>
			</div>

			{/* Recent Activity */}
			{logsData?.rows && logsData.rows.length > 0 && (
				<Card variant="beveled" padding="md" style={{ marginTop: 24 }}>
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>Recent Configuration Changes</span>
						{logsData.rows.map((log) => (
							<div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid var(--border-primary)' }}>
								{/* User initials circle */}
								<div style={{
									width: 28, height: 28, borderRadius: '50%', backgroundColor: 'var(--bg-tertiary)',
									display: 'flex', alignItems: 'center', justifyContent: 'center',
									fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0,
								}}>
									{(log.first_name?.[0] ?? '').toUpperCase()}{(log.last_name?.[0] ?? '').toUpperCase()}
								</div>
								<div style={{ flex: 1, minWidth: 0 }}>
									<span style={{ fontSize: 13, color: 'var(--text-primary)' }}>
										{log.first_name} {log.last_name}{' '}
										<span style={{ color: 'var(--text-muted)' }}>{log.action}</span>{' '}
										<span style={{ fontWeight: 500 }}>{log.entity_name}</span>
									</span>
								</div>
								<span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
									{dayjs(log.created_at).fromNow()}
								</span>
							</div>
						))}
					</div>
				</Card>
			)}
		</div>
	);
}
