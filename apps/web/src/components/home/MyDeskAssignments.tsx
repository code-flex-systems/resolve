'use client';

import Card from '@/components/ui/Card';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import dayjs from 'dayjs';
import { useMemo } from 'react';
import Skeleton from '@/components/ui/Skeleton';
import { IconBriefcase } from '@tabler/icons-react';

export default function MyDeskAssignments() {
	const { data: assignments = [], isLoading } = useDeskTrpc().getMyDeskAssignments();

	// Get the most recent assigned_at date for "last updated"
	const lastUpdated = useMemo(() => {
		if (assignments.length === 0) return null;
		return assignments.reduce((max, a) => {
			const date = dayjs(a.assigned_at);
			return date.isAfter(max) ? date : max;
		}, dayjs(assignments[0].assigned_at));
	}, [assignments]);

	return (
		<Card variant="beveled" padding="none" style={{ ...styles.container, overflow: 'hidden' }}>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					padding: '12px 16px',
					fontSize: 13,
					fontWeight: 600,
					color: 'var(--text-primary)',
					backgroundColor: 'var(--bg-secondary)',
					borderBottom: '1px solid var(--border)',
				}}
			>
				<IconBriefcase style={{ fontSize: 16, marginRight: 8, verticalAlign: 'text-bottom' }} />
				My Desk Assignments
			</div>
			<div style={{ ...styles.contentContainer, padding: 16 }}>
				{isLoading ? (
					<Skeleton variant="rect" width="100%" height="100%" />
				) : assignments.length === 0 ? (
					<div style={styles.emptyState}>
						<span style={{ color: 'text.secondary' }}>No desk assignments</span>
					</div>
				) : (
					<>
						<div
							style={{
								...styles.listContainer,
								display: 'flex',
								flexDirection: 'column' as const,
							}}
						>
							{assignments.map((assignment, index) => {
								const isPrimary = assignment.priority === 1;
								return (
									<div key={assignment.id} style={styles.assignmentRow}>
										<span style={{ ...styles.deskName, fontWeight: isPrimary ? 700 : 400 }}>
											{index + 1}. {assignment.desk_location_name}
										</span>
										<span style={{ color: 'text.secondary', fontWeight: isPrimary ? 600 : 400 }}>
											({Number(assignment.claim_count)} claims)
										</span>
									</div>
								);
							})}
						</div>
						{lastUpdated && (
							<span style={{ ...styles.lastUpdated, color: 'text.secondary' }}>
								Last updated: {lastUpdated.format('MMM D, YYYY')}
							</span>
						)}
					</>
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
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'space-between',
		background: 'linear-gradient(135deg, rgba(50, 174, 153, 0.03) 0%, rgba(255, 255, 255, 1) 100%)',
	},
	emptyState: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		height: '100%',
	},
	listContainer: {
		flex: 1,
		overflow: 'auto' as const,
	},
	assignmentRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 8,
	},
	deskName: {
		whiteSpace: 'nowrap',
		overflow: 'hidden' as const,
		textOverflow: 'ellipsis',
		maxWidth: 250,
	},
	lastUpdated: {
		marginTop: 1,
		display: 'block',
	},
};
