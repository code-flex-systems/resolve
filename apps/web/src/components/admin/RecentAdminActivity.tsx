'use client';

import Link from 'next/link';
import { IconArrowRight, IconMoodEmpty } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import { useAdminLogsTrpc } from '@/hooks/trpc/useAdminLogsTrpc';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

interface RecentAdminActivityProps {
	userId: string;
}

const ACTION_COLORS: Record<string, { bg: string; color: string }> = {
	CREATE: { bg: 'var(--status-success)', color: '#fff' },
	UPDATE: { bg: 'var(--text-accent)', color: '#fff' },
	DELETE: { bg: 'var(--status-error)', color: '#fff' },
};

function getActionStyle(action: string) {
	return ACTION_COLORS[action.toUpperCase()] ?? { bg: 'var(--bg-tertiary)', color: 'var(--text-secondary)' };
}

export default function RecentAdminActivity({ userId }: RecentAdminActivityProps) {
	const { data, isLoading } = useAdminLogsTrpc().listConfigLogs({
		userId,
		limit: 10,
	});

	const rows = data?.rows ?? [];

	return (
		<Card variant="beveled" padding="md" style={{ flex: 1, minWidth: 0 }}>
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
					Your Recent Activity
				</span>

				{isLoading && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
						{Array.from({ length: 5 }).map((_, i) => (
							<Skeleton key={i} width="100%" height={32} />
						))}
					</div>
				)}

				{!isLoading && rows.length === 0 && (
					<div
						style={{
							display: 'flex',
							flexDirection: 'column',
							alignItems: 'center',
							gap: 8,
							padding: '24px 0',
							color: 'var(--text-muted)',
						}}
					>
						<IconMoodEmpty size={28} />
						<span style={{ fontSize: 13 }}>No recent activity</span>
					</div>
				)}

				{!isLoading && rows.length > 0 && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
						{rows.map((row) => {
							const actionStyle = getActionStyle(row.action);
							return (
								<div
									key={row.id}
									style={{
										display: 'flex',
										alignItems: 'center',
										gap: 10,
										padding: '6px 4px',
									}}
								>
									<span
										style={{
											fontSize: 10,
											fontWeight: 600,
											padding: '2px 8px',
											borderRadius: 4,
											backgroundColor: actionStyle.bg,
											color: actionStyle.color,
											textTransform: 'uppercase',
											flexShrink: 0,
											letterSpacing: 0.5,
										}}
									>
										{row.action}
									</span>
									<span
										style={{
											flex: 1,
											fontSize: 13,
											overflow: 'hidden',
											textOverflow: 'ellipsis',
											whiteSpace: 'nowrap',
											textTransform: 'capitalize',
										}}
									>
										{row.entity_name}
									</span>
									<span
										style={{
											fontSize: 11,
											color: 'var(--text-muted)',
											flexShrink: 0,
											whiteSpace: 'nowrap',
										}}
									>
										{dayjs(row.created_at).fromNow()}
									</span>
								</div>
							);
						})}
					</div>
				)}

				{!isLoading && rows.length > 0 && (
					<Link
						href="/admin/system/logs"
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: 4,
							fontSize: 12,
							color: 'var(--text-accent)',
							textDecoration: 'none',
							alignSelf: 'flex-start',
						}}
					>
						View all
						<IconArrowRight size={14} />
					</Link>
				)}
			</div>
		</Card>
	);
}
