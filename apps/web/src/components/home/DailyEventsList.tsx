'use client';

import { Box, Stack, Typography , Fade } from '@mui/material';
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

	const handleClaimClick = (claimId: number) => {
		router.push(`/my-claims/${claimId}`);
	};

	return (
		<Box sx={{ ...styles.container, ...(flexGrow && styles.flexContainer) }}>
			<Typography variant="subtitle2" fontWeight={600} fontSize={14} mb={1.5}>
				{selectedDate ? selectedDate.format('MMMM D, YYYY') : 'Select a date'}
			</Typography>

			<Fade key={selectedDate?.toString() ?? 'empty'} in={true} timeout={1000}>
				<Box sx={{ ...styles.scrollContainer, ...(flexGrow && styles.flexScrollContainer) }}>
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
		borderTop: `1px solid ${'var(--border)'}`,
		paddingTop: 2,
		marginTop: 1,
	},
	flexContainer: {
		flex: 1,
		display: 'flex',
		flexDirection: 'column',
		minHeight: 0,
		overflow: 'hidden',
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
			background: 'var(--bg-tertiary)',
			borderRadius: '3px',
		},
		'&::-webkit-scrollbar-thumb': {
			background: 'var(--bg-secondary)',
			borderRadius: '3px',
			'&:hover': {
				background: 'var(--bg-tertiary)',
			},
		},
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
