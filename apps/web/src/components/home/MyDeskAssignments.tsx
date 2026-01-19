'use client';

import { Box, Skeleton, Stack, Typography } from '@mui/material';
import { containerStyles } from '@/styles/theme';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import WorkOutline from '@mui/icons-material/WorkOutline';
import dayjs from 'dayjs';
import { useMemo } from 'react';

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
		<Box sx={{ ...containerStyles.section, ...styles.container }}>
			<Typography sx={containerStyles.sectionTitle}>
				<WorkOutline sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
				My Desk Assignments
			</Typography>
			<Box sx={{ ...containerStyles.sectionContent, ...styles.contentContainer }}>
				{isLoading ? (
					<Skeleton variant="rectangular" width="100%" height="100%" sx={{ borderRadius: 1 }} />
				) : assignments.length === 0 ? (
					<Box sx={styles.emptyState}>
						<Typography variant="body2" color="text.secondary">
							No desk assignments
						</Typography>
					</Box>
				) : (
					<>
						<Stack spacing={0.5} sx={styles.listContainer}>
							{assignments.map((assignment, index) => {
								const isPrimary = assignment.priority === 1;
								return (
									<Box key={assignment.id} sx={styles.assignmentRow}>
										<Typography
											variant="body2"
											fontWeight={isPrimary ? 700 : 400}
											sx={styles.deskName}
										>
											{index + 1}. {assignment.desk_location_name}
										</Typography>
										<Typography
											variant="body2"
											color="text.secondary"
											fontWeight={isPrimary ? 600 : 400}
										>
											({Number(assignment.claim_count)} claims)
										</Typography>
									</Box>
								);
							})}
						</Stack>
						{lastUpdated && (
							<Typography variant="caption" color="text.secondary" sx={styles.lastUpdated}>
								Last updated: {lastUpdated.format('MMM D, YYYY')}
							</Typography>
						)}
					</>
				)}
			</Box>
		</Box>
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
		flexDirection: 'column',
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
		overflow: 'auto',
	},
	assignmentRow: {
		display: 'flex',
		alignItems: 'center',
		gap: 1,
	},
	deskName: {
		whiteSpace: 'nowrap',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		maxWidth: 250,
	},
	lastUpdated: {
		marginTop: 1,
		display: 'block',
	},
};
