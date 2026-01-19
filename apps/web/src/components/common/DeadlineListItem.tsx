'use client';

import { useState } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import dayjs from 'dayjs';
import theme, { containerStyles } from '@/styles/theme';
import { DeadlineEntityType, DeadlineStatus } from '@/config/enums';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import DeadlineDetailDialog from './DeadlineDetailDialog';

interface DeadlineListItemProps {
	deadline: Deadline;
	onClaimClick: (claimId: number) => void;
	showTime?: boolean;
	showDate?: boolean;
}

const MUTED_COLOR = theme.palette.text.disabled;

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
		const color = isOverdue && isPending ? theme.palette.error.main : MUTED_COLOR;
		return <CalendarTodayIcon sx={{ ...styles.icon, color }} />;
	}

	// Task deadlines - show status-based icons
	switch (deadline.status) {
		case DeadlineStatus.PENDING: {
			const color = isOverdue ? theme.palette.error.main : MUTED_COLOR;
			return <RadioButtonUncheckedIcon sx={{ ...styles.icon, color }} />;
		}
		case DeadlineStatus.MET:
			return <CheckCircleIcon sx={{ ...styles.icon, color: theme.palette.success.main }} />;
		case DeadlineStatus.MISSED:
			return <CancelIcon sx={{ ...styles.icon, color: theme.palette.error.main }} />;
		case DeadlineStatus.CANCELLED:
			return <CancelIcon sx={{ ...styles.icon, color: MUTED_COLOR }} />;
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
			<Box sx={{ ...styles.deadlineItem, ...containerStyles.beveledCard }} onClick={handleItemClick}>
				<Stack spacing={0.5}>
					<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" gap={0.5}>
						<Box display="flex" alignItems="center" gap={1}>
							{getDeadlineIcon(deadline)}
							<Typography variant="body2" fontWeight={600} fontSize={13}>
								{formatDeadlineType(deadline.deadline_type)}
							</Typography>
						</Box>
						{showTime && (
							<Typography fontSize={12} color={isOverduePending ? 'error.main' : 'text.secondary'}>
								{dayjs(deadline.deadline_date).format('h:mm A')}
							</Typography>
						)}
						{showDate && (
							<Typography fontSize={12} color={isOverduePending ? 'error.main' : 'text.secondary'}>
								{dayjs(deadline.deadline_date).format('MMM D, YYYY')}
							</Typography>
						)}
					</Box>

					{deadline.description && (
						<Typography variant="caption" fontSize={12} color="text.secondary">
							{deadline.description}
						</Typography>
					)}

					<Typography
						variant="caption"
						fontSize={12}
						color="primary.main"
						sx={{
							cursor: 'pointer',
							'&:hover': {
								textDecoration: 'underline',
							},
						}}
						onClick={handleClaimClick}
					>
						{deadline.claim_number}
					</Typography>
				</Stack>
			</Box>

			{showDetailDialog && (
				<DeadlineDetailDialog deadline={deadline} onClose={() => setShowDetailDialog(false)} />
			)}
		</>
	);
}

const styles = {
	deadlineItem: {
		padding: '10px 12px',
		borderRadius: 1,
		transition: 'all 0.2s',
		cursor: 'pointer',
		'&:hover': {
			backgroundColor: theme.palette.action.selected,
			borderColor: theme.palette.primary.light,
		},
	},
	icon: {
		fontSize: 16,
	},
};
