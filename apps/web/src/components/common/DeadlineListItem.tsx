import { Box, Stack, Typography } from '@mui/material';
import { Deadline } from '@/hooks/trpc/useRecoveryTrpc';
import dayjs from 'dayjs';
import theme from '@/styles/theme';
import { DeadlineStatus } from '@/config/enums';
import TimelapseIcon from '@mui/icons-material/Timelapse';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';

interface DeadlineListItemProps {
	deadline: Deadline;
	onClaimClick: (claimId: string) => void;
	showTime?: boolean;
}

/**
 * Get icon for deadline status
 */
function getDeadlineStatusIcon(status: string) {
	switch (status) {
		case DeadlineStatus.PENDING:
			return <TimelapseIcon sx={{ ...styles.icon, color: theme.palette.primary.main }} />;
		case DeadlineStatus.MET:
			return <CheckCircleIcon sx={{ ...styles.icon, color: theme.palette.success.main }} />;
		case DeadlineStatus.MISSED:
			return <CancelIcon sx={{ ...styles.icon, color: theme.palette.error.main }} />;
		case DeadlineStatus.EXTENDED:
			return <CalendarMonthIcon sx={{ ...styles.icon, color: theme.palette.warning.main }} />;
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
export default function DeadlineListItem({ deadline, onClaimClick, showTime = true }: DeadlineListItemProps) {
	return (
		<Box sx={styles.deadlineItem}>
			<Stack spacing={0.5}>
				<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" gap={0.5}>
					<Box display="flex" alignItems="center" gap={1}>
						{getDeadlineStatusIcon(deadline.status)}
						<Typography variant="body2" fontWeight={600} fontSize={13}>
							{formatDeadlineType(deadline.deadline_type)}
						</Typography>
					</Box>
					{showTime && (
						<Typography fontSize={12} color="text.secondary">
							{dayjs(deadline.deadline_date).format('h:mm A')}
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
					onClick={() => {
						if (deadline.claim_number) onClaimClick(deadline.claim_number);
					}}
				>
					Claim {deadline.claim_number}
				</Typography>
			</Stack>
		</Box>
	);
}

const styles = {
	deadlineItem: {
		padding: '10px 12px',
		borderRadius: 1,
		backgroundColor: '#FAFAFA',
		border: `1px solid ${theme.palette.divider}`,
		transition: 'all 0.2s',
		'&:hover': {
			backgroundColor: theme.palette.action.selected,
			borderColor: theme.palette.primary.light,
		},
	},
	icon: {
		fontSize: 16,
	},
};
