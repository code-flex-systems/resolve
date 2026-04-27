'use client';

import { Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import { Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import DeadlineListItem from '@/components/common/DeadlineListItem';

interface DailyEventsListProps {
	deadlines: Deadline[];
	selectedDate: Dayjs | null;
	flexGrow?: boolean;
}

/**
 * Displays a scrollable list of deadlines for the selected day
 */
export default function DailyEventsList({ deadlines, selectedDate, flexGrow }: DailyEventsListProps) {
	const router = useRouter();

	const handleClaimClick = (claimId: string) => {
		router.push(`/my-claims/${claimId}`);
	};

	return (
		<div style={{ ...styles.container, ...(flexGrow && styles.flexContainer) }}>
			<span style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
				{selectedDate ? selectedDate.format('MMMM D, YYYY') : 'Select a date'}
			</span>

			<div style={{ ...styles.scrollContainer, ...(flexGrow && styles.flexScrollContainer) }}>
					{deadlines.length === 0 ? (
						<div style={styles.emptyState}>
							<span style={{ color: 'text.secondary', textAlign: 'center' as const }}>
								No deadlines for this day
							</span>
						</div>
					) : (
						<div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
							{deadlines.map((deadline) => (
								<DeadlineListItem
									key={deadline.id}
									deadline={deadline}
									onClaimClick={handleClaimClick}
									showTime={true}
								/>
							))}
						</div>
					)}
				</div>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		borderTop: `1px solid ${'var(--border)'}`,
		paddingTop: 2,
		marginTop: 1,
	},
	flexContainer: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
		overflow: 'hidden' as const,
	},
	scrollContainer: {
		maxHeight: 220,
		overflowY: 'auto' as const,
		overflowX: 'hidden' as const,
		paddingRight: 8,
	},
	flexScrollContainer: {
		flex: 1,
		maxHeight: 'none',
	},
	emptyState: {
		padding: 4,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 100,
	},
};
