'use client';

import { Card, CardContent, Grid, Skeleton, Typography } from '@mui/material';

interface TaskMetricsProps {
	openTasks: number;
	overdueTasks: number;
	avgCompletionDays: number | null;
	isLoading?: boolean;
}

export default function TaskMetrics({
	openTasks,
	overdueTasks,
	avgCompletionDays,
	isLoading,
}: TaskMetricsProps) {
	return (
		<Grid container spacing={1} mb={1.5}>
			{/* Open Tasks */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Open Tasks
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={40} height={24} sx={{ mb: 0.5 }} />
								<Skeleton variant="text" width={80} height={16} />
							</>
						) : (
							<>
								<Typography variant="h6" fontSize={16} component="div">
									{openTasks}
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									pending + in progress
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Overdue Tasks */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Overdue
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={40} height={24} sx={{ mb: 0.5 }} />
								<Skeleton variant="text" width={70} height={16} />
							</>
						) : (
							<>
								<Typography
									variant="h6"
									fontSize={16}
									component="div"
									color={overdueTasks > 0 ? 'error.main' : 'inherit'}
								>
									{overdueTasks}
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									past due date
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Average Completion Time */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Avg Completion
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={60} height={24} sx={{ mb: 0.5 }} />
								<Skeleton variant="text" width={90} height={16} />
							</>
						) : (
							<>
								<Typography variant="h6" fontSize={16} component="div">
									{avgCompletionDays !== null ? `${avgCompletionDays.toFixed(1)} days` : '-'}
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									create to complete
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
}
