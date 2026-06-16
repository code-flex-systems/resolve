'use client';

import { useMemo } from 'react';
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	Tooltip,
	ResponsiveContainer,
	CartesianGrid,
	Cell,
	ReferenceLine,
} from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { RecoveryRateByCarrier } from '@/hooks/trpc/useFinancialReportingTrpc';

interface Props {
	data: RecoveryRateByCarrier[];
}

function CustomTooltip({ active, payload }: any) {
	if (!active || !payload?.length) return null;
	const row = payload[0]?.payload as RecoveryRateByCarrier;
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
			<p style={{ margin: 0, fontWeight: 600 }}>{row.party_name}</p>
			<p style={{ margin: '4px 0 0' }}>Recovery Rate: {row.recovery_rate.toFixed(1)}%</p>
			<p style={{ margin: '4px 0 0' }}>Demand Total: {formatCurrency(row.demand_total)}</p>
			<p style={{ margin: '4px 0 0' }}>Settled Total: {formatCurrency(row.settled_total)}</p>
			<p style={{ margin: '4px 0 0' }}>Settlements: {row.settlement_count}</p>
			<p style={{ margin: '4px 0 0' }}>Avg Days to Settle: {row.avg_days_to_settle}</p>
		</div>
	);
}

export default function CarrierRateChart({ data }: Props) {
	const avgRate = useMemo(() => {
		if (!data.length) return 0;
		const totalDemand = data.reduce((s, d) => s + d.demand_total, 0);
		const totalSettled = data.reduce((s, d) => s + d.settled_total, 0);
		return totalDemand > 0 ? (totalSettled / totalDemand) * 100 : 0;
	}, [data]);

	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<ResponsiveContainer width="100%" height={350}>
				<BarChart data={data} layout="vertical" margin={{ left: 120 }}>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
					<XAxis
						type="number"
						domain={[0, 100]}
						tickFormatter={(v: number) => `${v}%`}
						tick={{ fontSize: 12 }}
					/>
					<YAxis type="category" dataKey="party_name" tick={{ fontSize: 12 }} width={110} />
					<Tooltip content={<CustomTooltip />} />
					<ReferenceLine
						x={avgRate}
						stroke="#ba68c8"
						strokeDasharray="3 3"
						label={{ value: `Avg ${avgRate.toFixed(1)}%`, position: 'top', fontSize: 11 }}
					/>
					<Bar dataKey="recovery_rate" name="Recovery Rate">
						{data.map((entry, i) => (
							<Cell key={i} fill={entry.recovery_rate >= avgRate ? '#81c784' : '#e57373'} />
						))}
					</Bar>
				</BarChart>
			</ResponsiveContainer>
		</Card>
	);
}
