'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { SettlementFunnelStage } from '@/hooks/trpc/useFinancialReportingTrpc';

interface SettlementFunnelChartProps {
	data: SettlementFunnelStage[];
}

const COLORS = ['#4fc3f7', '#4dd0e1', '#4db6ac', '#81c784', '#aed581', '#c5e1a5', '#dce775'];

function toTitleCase(s: string | null): string {
	if (!s) return '';
	return s
		.split('_')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

export default function SettlementFunnelChart({ data }: SettlementFunnelChartProps) {
	const chartData = data.map((d) => ({
		...d,
		label: toTitleCase(d.stage),
	}));

	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
				Settlement Funnel
			</h3>
			<ResponsiveContainer width="100%" height={350}>
				<BarChart data={chartData} layout="vertical" barCategoryGap="20%">
					<XAxis type="number" tick={{ fontSize: 11 }} />
					<YAxis
						dataKey="label"
						type="category"
						width={140}
						tick={{ fontSize: 11 }}
					/>
					<Tooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const d = payload[0].payload as SettlementFunnelStage & { label: string };
							return (
								<div
									style={{
										background: 'var(--bg-secondary, #1e1e1e)',
										border: '1px solid var(--border-primary, #333)',
										borderRadius: 8,
										padding: '8px 12px',
										fontSize: 12,
										color: 'var(--text-primary, #e0e0e0)',
									}}
								>
									<div style={{ fontWeight: 600, marginBottom: 4 }}>{d.label}</div>
									<div>Count: {d.count}</div>
									<div>Expected: {formatCurrency(d.total_expected)}</div>
									<div>Actual: {formatCurrency(d.total_actual)}</div>
									<div>Incurred: {formatCurrency(d.total_incurred)}</div>
								</div>
							);
						}}
					/>
					<Bar dataKey="count" radius={[0, 4, 4, 0]}>
						{chartData.map((_, index) => (
							<Cell key={index} fill={COLORS[index % COLORS.length]} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Card>
	);
}
