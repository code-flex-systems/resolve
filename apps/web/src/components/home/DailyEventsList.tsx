'use client';

import { Box, Fade, Stack, Typography } from '@mui/material';
import { Deadline } from '@/hooks/trpc/useRecoveryTrpc';
import { Dayjs } from 'dayjs';
import theme from '@/styles/theme';
import { useRouter } from 'next/navigation';
import DeadlineListItem from '@/components/common/DeadlineListItem';

interface DailyEventsListProps {
	deadlines: Deadline[];
	selectedDate: Dayjs | null;
}

/**
 * Displays a scrollable list of deadlines for the selected day
 */
export default function DailyEventsList({ deadlines, selectedDate }: DailyEventsListProps) {
	const router = useRouter();

	const handleClaimClick = (claimId: number) => {
		// Navigate to claim detail (could also open in a dialog/panel)
		router.push(`/claim/${claimId}`);
	};

	return (
		<Box sx={styles.container}>
			<Typography variant="subtitle2" fontWeight={600} fontSize={14} mb={1.5}>
				{selectedDate ? selectedDate.format('MMMM D, YYYY') : 'Select a date'}
			</Typography>

			<Fade key={selectedDate?.toString() ?? 'empty'} in={true} timeout={1000}>
				<Box sx={styles.scrollContainer}>
					{deadlines.length === 0 ? (
						<Box sx={styles.emptyState}>
							<Typography variant="body2" color="text.secondary" textAlign="center">
								No deadlines for this day
							</Typography>
						</Box>
					) : (
						<Stack spacing={1}>
							{deadlines.map((deadline) => (
								<DeadlineListItem
									key={deadline.id}
									deadline={deadline}
									onClaimClick={handleClaimClick}
									showTime={true}
								/>
							))}
						</Stack>
					)}
				</Box>
			</Fade>
		</Box>
	);
}

const styles = {
	container: {
		width: '100%',
		borderTop: `1px solid ${theme.palette.divider}`,
		paddingTop: 2,
		marginTop: 1,
	},
	scrollContainer: {
		maxHeight: 220,
		overflowY: 'auto',
		overflowX: 'hidden',
		paddingRight: 1,
		'&::-webkit-scrollbar': {
			width: '6px',
		},
		'&::-webkit-scrollbar-track': {
			background: theme.palette.action.hover,
			borderRadius: '3px',
		},
		'&::-webkit-scrollbar-thumb': {
			background: theme.palette.action.selected,
			borderRadius: '3px',
			'&:hover': {
				background: theme.palette.action.disabled,
			},
		},
	},
	emptyState: {
		padding: 4,
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 100,
	},
};
