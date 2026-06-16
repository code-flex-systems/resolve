'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '@/components/ui/Card';
import type { RecoveryTimeDistribution } from '@/hooks/trpc/useFinancialReportingTrpc';

interface RecoveryDistributionChartProps {
	data: RecoveryTimeDistribution[];
}

// Gradient from green (fast recovery) to red (slow recovery)
const BUCKET_COLORS = ['#4caf50', '#8bc34a', '#ffb74d', '#ff9800', '#f44336', '#b71c1c'];

export default function RecoveryDistributionChart({ data }: RecoveryDistributionChartProps) {
	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<ResponsiveContainer width="100%" height={350}>
				<BarChart data={data} barCategoryGap="15%">
					<XAxis
						dataKey="bucket"
						tick={{ fontSize: 11 }}
						label={{ value: 'Days', position: 'insideBottom', offset: -2, fontSize: 12 }}
					/>
					<YAxis
						tick={{ fontSize: 11 }}
						label={{ value: 'Count', angle: -90, position: 'insideLeft', fontSize: 12 }}
					/>
					<Tooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const d = payload[0].payload as RecoveryTimeDistribution;
							return (
								<div
									style={{
										background: 'var(--bg-secondary, #1e1e1e)',
										border: '1px solid var(--border-primary, #333)',
										borderRadius: 8,
										padding: '8px 12px',
										fontSize: 'var(--text-xs)',
										color: 'var(--text-primary, #e0e0e0)',
									}}
								>
									<div style={{ fontWeight: 600, marginBottom: 4 }}>{d.bucket} days</div>
									<div>Claims: {d.count}</div>
									<div>Avg Days: {d.avg_days}</div>
								</div>
							);
						}}
					/>
					<Bar dataKey="count" radius={[4, 4, 0, 0]}>
						{data.map((_, index) => (
							<Cell key={index} fill={BUCKET_COLORS[index % BUCKET_COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Card>
	);
}
