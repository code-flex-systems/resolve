'use client';

import { useState } from 'react';
import { Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import dayjs from 'dayjs';
import { DeadlineEntityType, DeadlineStatus } from '@/config/enums';
import { IconCircleCheck, IconCircleX, IconCircle, IconCalendar } from '@tabler/icons-react';
import DeadlineDetailDialog from './DeadlineDetailDialog';
import css from './DeadlineListItem.module.css';

interface DeadlineListItemProps {
	deadline: Deadline;
	onClaimClick: (claimId: string) => void;
	showTime?: boolean;
	showDate?: boolean;
}

const MUTED_COLOR = 'var(--text-muted)';

/**
 * Get icon for deadline based on entity type and status
 * - Non-task deadlines: Calendar icon (error if overdue, muted otherwise)
 * - Task deadlines: Circle icons based on completion state
 */
function getDeadlineIcon(deadline: Deadline) {
	const isTaskDeadline = deadline.entity_type === DeadlineEntityType.TASK;
	const isOverdue = dayjs(deadline.deadline_date).isBefore(dayjs());
	const isPending = deadline.status === DeadlineStatus.PENDING;

	// Non-task deadlines (calendar entries) - calendar icon with error color if overdue
	if (!isTaskDeadline) {
		const color = isOverdue && isPending ? 'var(--status-error)' : MUTED_COLOR;
		return <IconCalendar size={16} style={{ color }} />;
	}

	// Task deadlines - show status-based icons
	switch (deadline.status) {
		case DeadlineStatus.PENDING: {
			const color = isOverdue ? 'var(--status-error)' : MUTED_COLOR;
			return <IconCircle size={16} style={{ color }} />;
		}
		case DeadlineStatus.MET:
			return <IconCircleCheck size={16} style={{ color: 'var(--status-success)' }} />;
		case DeadlineStatus.MISSED:
			return <IconCircleX size={16} style={{ color: 'var(--status-error)' }} />;
		case DeadlineStatus.CANCELLED:
			return <IconCircleX size={16} style={{ color: MUTED_COLOR }} />;
		default:
			return null;
	}
}

/**
 * Format deadline type for display
 */
export function formatDeadlineType(type: string): string {
	return type
		.split('_')
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join(' ');
}

/**
 * Reusable deadline list item component
 * Used in DailyEventsList and MyClaimsDeadlines
 */
export default function DeadlineListItem({
	deadline,
	onClaimClick,
	showTime = true,
	showDate = false,
}: DeadlineListItemProps) {
	const [showDetailDialog, setShowDetailDialog] = useState(false);

	// Check if this is an overdue pending deadline (for styling date/time)
	const isOverdue = dayjs(deadline.deadline_date).isBefore(dayjs());
	const isOverduePending = isOverdue && deadline.status === DeadlineStatus.PENDING;

	const handleItemClick = () => {
		setShowDetailDialog(true);
	};

	const handleClaimClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onClaimClick(deadline.claim_id);
	};

	return (
		<>
			<div className={css.deadlineItem} onClick={handleItemClick}>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							gap: 4,
						}}
					>
						<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
							{getDeadlineIcon(deadline)}
							<span style={{ fontWeight: 600, fontSize: 13 }}>
								{formatDeadlineType(deadline.deadline_type)}
							</span>
						</div>
						{showTime && (
							<span
								style={{
									fontSize: 12,
									color: isOverduePending ? 'var(--color-error)' : 'var(--text-secondary)',
								}}
							>
								{dayjs(deadline.deadline_date).format('h:mm A')}
							</span>
						)}
						{showDate && (
							<span
								style={{
									fontSize: 12,
									color: isOverduePending ? 'var(--color-error)' : 'var(--text-secondary)',
								}}
							>
								{dayjs(deadline.deadline_date).format('MMM D, YYYY')}
							</span>
						)}
					</div>

					{deadline.description && (
						<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
							{deadline.description}
						</span>
					)}

					<span className={css.claimLink} onClick={handleClaimClick}>
						{deadline.claim_number}
					</span>
				</div>
			</div>

			{showDetailDialog && (
				<DeadlineDetailDialog deadline={deadline} onClose={() => setShowDetailDialog(false)} />
			)}
		</>
	);
}
