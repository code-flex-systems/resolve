import { Box, Card, CardContent, Grid, Typography } from '@mui/material';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import Skeleton from '@/components/ui/Skeleton';

interface MyClaimsMetricsProps {
	count: number;
	totalValue: number;
	avgDaysInQueue: number;
	isLoading?: boolean;
}

export default function MyClaimsMetrics({ count, totalValue, avgDaysInQueue, isLoading }: MyClaimsMetricsProps) {

	return (
		<Grid container spacing={1} mb={1.5}>
			{/* Filtered Results */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Filtered Results
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={40} height={24} />
								<Skeleton variant="text" width={50} height={16} />
							</>
						) : (
							<>
								<Typography variant="h6" fontSize={16} component="div">
									{count}
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									{count === 1 ? 'claim' : 'claims'}
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Total Value */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Total Value
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={80} height={24} />
								<Skeleton variant="text" width={90} height={16} />
							</>
						) : (
							<>
								<Typography variant="h6" fontSize={16} component="div">
									{formatCurrency(totalValue)}
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									claim amounts
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Average Time in Queue */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<Typography color="#d9d9d9" fontSize={12} gutterBottom>
							Avg Time in Queue
						</Typography>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={70} height={24} />
								<Skeleton variant="text" width={100} height={16} />
							</>
						) : (
							<>
								<Typography variant="h6" fontSize={16} component="div">
									{avgDaysInQueue} days
								</Typography>
								<Typography variant="body2" fontSize={12} color="text.secondary">
									since assignment
								</Typography>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
}
