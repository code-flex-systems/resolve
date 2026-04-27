'use client';

import Chip from '@/components/ui/Chip';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { ClaimStatus } from '@/config/enums';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';

export default function MyClaimsMetric() {
	const { data: session } = useClerkSession();
	const { data: stats = {} as Record<ClaimStatus, number>, isLoading } = useChecklistTrpc().stats(
		{ users: session?.user?.id ? [session.user.id] : [] },
		{ enabled: !!session?.user?.id }
	);

	const totalOpen =
		(stats[ClaimStatus.IN_PROGRESS] ?? 0) + (stats[ClaimStatus.BLOCKED] ?? 0) + (stats[ClaimStatus.UNWORKED] ?? 0);

	return (
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
			<div style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>My Open Claims</div>
			<div style={{ ...styles.contentContainer, padding: 16 }}>
				{isLoading ? (
					<Skeleton variant="rect" width="100%" height="100%" />
				) : (
					<div style={{ display: 'flex', flexDirection: 'column' as const, width: '100%', height: '100%', gap: 16 }}>
						{/* Main Count */}
						<div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
							<span style={{ fontSize: 48, fontWeight: 700, color: 'primary' }}>
								{totalOpen}
							</span>
							<span style={{ color: 'text.secondary' }}>
								open {totalOpen === 1 ? 'claim' : 'claims'}
							</span>
						</div>

						{/* Status Breakdown */}
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
							<Chip color="warning" size="sm">{`${stats[ClaimStatus.IN_PROGRESS] ?? 0} In Progress`}</Chip>
							<Chip color="warning" size="sm">{`${stats[ClaimStatus.BLOCKED] ?? 0} Blocked`}</Chip>
							<Chip color="error" size="sm">{`${stats[ClaimStatus.UNWORKED] ?? 0} Unworked`}</Chip>
						</div>
					</div>
				)}
			</div>
		</Card>
	);
}

const styles = {
	container: {
		width: 400,
		minWidth: 400,
		height: 180,
		margin: '15px',
	},
	contentContainer: {
		height: 'calc(100% - 45px)',
		background: 'linear-gradient(135deg, rgba(50, 174, 153, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
	},
};
