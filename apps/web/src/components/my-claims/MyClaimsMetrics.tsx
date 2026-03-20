import Card from '@/components/ui/Card';
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
		<div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
			{/* Filtered Results */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
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
							<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								{count === 1 ? 'claim' : 'claims'}
							</span>
						</>
					)}
				</div>
			</Card>

			{/* Total Value */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
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
							<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								claim amounts
							</span>
						</>
					)}
				</div>
			</Card>

			{/* Average Time in Queue */}
			<Card variant="beveled" padding="none" style={{ flex: 1 }}>
				<div style={{ padding: 8 }}>
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
							<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
								since assignment
							</span>
						</>
					)}
				</div>
			</Card>
		</div>
	);
}
