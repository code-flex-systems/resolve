'use client';

import { useMemo } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { CoverageCapUtilization } from '@/hooks/trpc/useFinancialReportingTrpc';

interface Props {
	data: CoverageCapUtilization[];
}

function getCategoryColor(category: string): string {
	if (category.startsWith('Cap Constrained')) return '#e57373';
	if (category.startsWith('Near Cap')) return '#ffb74d';
	if (category.startsWith('Below Cap')) return '#81c784';
	return '#4db6ac';
}

function CustomTooltip({ active, payload }: any) {
	if (!active || !payload?.length) return null;
	const row = payload[0]?.payload as CoverageCapUtilization;
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
			<p style={{ margin: 0, fontWeight: 600 }}>{row.category}</p>
			<p style={{ margin: '4px 0 0' }}>Count: {row.count}</p>
			<p style={{ margin: '4px 0 0' }}>Total Demanded: {formatCurrency(row.total_demanded)}</p>
			<p style={{ margin: '4px 0 0' }}>Total Settled: {formatCurrency(row.total_settled)}</p>
			<p style={{ margin: '4px 0 0' }}>Demand Exceeding Cap: {formatCurrency(row.demand_exceeding_cap)}</p>
		</div>
	);
}

export default function CapUtilizationChart({ data }: Props) {
	const totalCount = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);

	return (
		<ResponsiveContainer width="100%" minWidth={350} height={350}>
			<PieChart>
				<Pie
					data={data}
					dataKey="count"
					nameKey="category"
					cx="50%"
					cy="50%"
					innerRadius={80}
					outerRadius={130}
					paddingAngle={2}
				>
					{data.map((entry, i) => (
						<Cell key={i} fill={getCategoryColor(entry.category)} />
					))}
				</Pie>
				<Tooltip content={<CustomTooltip />} />
				<text
					x="50%"
					y="48%"
					textAnchor="middle"
					dominantBaseline="middle"
					style={{ fontSize: 28, fontWeight: 700, fill: 'var(--color-text-primary)' }}
				>
					{totalCount}
				</text>
				<text
					x="50%"
					y="58%"
					textAnchor="middle"
					dominantBaseline="middle"
					style={{ fontSize: 12, fill: 'var(--color-text-secondary)' }}
				>
					Total
				</text>
			</PieChart>
		</ResponsiveContainer>
	);
}
