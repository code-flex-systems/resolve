import KpiCard from '@/components/ui/KpiCard';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import Skeleton from '@/components/ui/Skeleton';

interface MyClaimsMetricsProps {
	count: number;
	totalValue: number;
	avgDaysInQueue: number;
	isLoading?: boolean;
}

export default function MyClaimsMetrics({
	count,
	totalValue,
	avgDaysInQueue,
	isLoading,
}: MyClaimsMetricsProps) {
	if (isLoading) {
		return (
			<div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
				<Skeleton variant="rect" width="33%" height={90} />
				<Skeleton variant="rect" width="33%" height={90} />
				<Skeleton variant="rect" width="33%" height={90} />
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
			<KpiCard
				size="sm"
				value={count}
				label="Filtered Results"
				subtitle={count === 1 ? 'claim' : 'claims'}
			/>
			<KpiCard
				size="sm"
				value={formatCurrency(totalValue)}
				label="Total Value"
				subtitle="claim amounts"
			/>
			<KpiCard
				size="sm"
				value={`${avgDaysInQueue} days`}
				label="Avg Time in Queue"
				subtitle="since assignment"
			/>
		</div>
	);
}
