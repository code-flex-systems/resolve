'use client';

import { useMemo } from 'react';
import {
	ComposedChart,
	Bar,
	Line,
	XAxis,
	YAxis,
	Tooltip,
	Legend,
	ResponsiveContainer,
	CartesianGrid,
} from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { NetRecoveryByMonth } from '@/hooks/trpc/useFinancialReportingTrpc';

interface Props {
	data: NetRecoveryByMonth[];
}

function formatPeriod(period: string): string {
	const [year, month] = period.split('-');
	const date = new Date(Number(year), Number(month) - 1);
	return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	return (
		<div style={{ background: 'var(--bg-secondary, #1e1e1e)', border: '1px solid var(--border-primary, #333)', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: 'var(--text-primary, #e0e0e0)' }}>
			<p style={{ margin: 0, fontWeight: 600 }}>{formatPeriod(label)}</p>
			{payload.map((entry: any) => (
				<p key={entry.dataKey} style={{ margin: '4px 0 0', color: entry.color }}>
					{entry.name}: {entry.dataKey === 'net_recovery_rate' ? `${Number(entry.value).toFixed(1)}%` : formatCurrency(Math.abs(entry.value))}
				</p>
			))}
		</div>
	);
}

export default function NetRecoveryMonthChart({ data }: Props) {
	const chartData = useMemo(
		() => data.map((d) => ({ ...d, payments_out_neg: -d.payments_out, periodLabel: formatPeriod(d.period) })),
		[data]
	);

	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<h3 style={{ margin: '0 0 16px' }}>Net Recovery by Month</h3>
			<ResponsiveContainer width="100%" height={350}>
				<ComposedChart data={chartData}>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
					<XAxis dataKey="period" tickFormatter={formatPeriod} tick={{ fontSize: 11 }} />
					<YAxis yAxisId="left" tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 12 }} domain={[(dataMin: number) => Math.min(dataMin, 0), 'auto']} />
					<YAxis yAxisId="right" orientation="right" tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 12 }} />
					<Tooltip content={<CustomTooltip />} />
					<Legend />
					<Bar yAxisId="left" dataKey="payments_out_neg" name="Payments Out" fill="#e57373" />
					<Bar yAxisId="left" dataKey="recovery_in" name="Recovery In" fill="#81c784" />
					<Line yAxisId="right" dataKey="net_recovery_rate" name="Net Recovery Rate" type="monotone" stroke="#4fc3f7" strokeWidth={2} dot={{ r: 3 }} />
				</ComposedChart>
			</ResponsiveContainer>
		</Card>
	);
}
