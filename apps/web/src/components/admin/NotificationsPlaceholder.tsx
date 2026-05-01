'use client';

import { IconBell } from '@tabler/icons-react';
import Card from '@/components/ui/Card';

export default function NotificationsPlaceholder() {
	return (
		<Card variant="beveled" padding="md">
			<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
				<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
					Notifications
				</span>
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						gap: 12,
						padding: '32px 16px',
					}}
				>
					<IconBell size={40} style={{ color: 'var(--text-muted)' }} />
					<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No notifications yet</span>
					<span
						style={{
							fontSize: 12,
							color: 'var(--text-muted)',
							textAlign: 'center',
							maxWidth: 400,
							lineHeight: 1.5,
						}}
					>
						Notifications will appear here when workflow events, SLA breaches, or assignments
						require your attention.
					</span>
				</div>
			</div>
		</Card>
	);
}
