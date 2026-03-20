import { Card, CardContent, Grid } from '@mui/material';
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
						<span style={{ color: '#d9d9d9', fontSize: 12 }}>
							Filtered Results
						</span>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={40} height={24} />
								<Skeleton variant="text" width={50} height={16} />
							</>
						) : (
							<>
								<span style={{ fontSize: 16 }}>
									{count}
								</span>
								<span style={{ fontSize: 12, color: 'text.secondary' }}>
									{count === 1 ? 'claim' : 'claims'}
								</span>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Total Value */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<span style={{ color: '#d9d9d9', fontSize: 12 }}>
							Total Value
						</span>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={80} height={24} />
								<Skeleton variant="text" width={90} height={16} />
							</>
						) : (
							<>
								<span style={{ fontSize: 16 }}>
									{formatCurrency(totalValue)}
								</span>
								<span style={{ fontSize: 12, color: 'text.secondary' }}>
									claim amounts
								</span>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>

			{/* Average Time in Queue */}
			<Grid>
				<Card variant="outlined" sx={{ height: '100%' }}>
					<CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
						<span style={{ color: '#d9d9d9', fontSize: 12 }}>
							Avg Time in Queue
						</span>
						{isLoading ? (
							<>
								<Skeleton variant="text" width={70} height={24} />
								<Skeleton variant="text" width={100} height={16} />
							</>
						) : (
							<>
								<span style={{ fontSize: 16 }}>
									{avgDaysInQueue} days
								</span>
								<span style={{ fontSize: 12, color: 'text.secondary' }}>
									since assignment
								</span>
							</>
						)}
					</CardContent>
				</Card>
			</Grid>
		</Grid>
	);
}
