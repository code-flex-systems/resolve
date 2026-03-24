'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { NetRecoveryByLob } from '@/hooks/trpc/useFinancialReportingTrpc';

interface Props {
	data: NetRecoveryByLob[];
}

function CustomTooltip({ active, payload, label }: any) {
	if (!active || !payload?.length) return null;
	const row = payload[0]?.payload as NetRecoveryByLob;
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
			<p style={{ margin: 0, fontWeight: 600 }}>{label}</p>
			{payload.map((entry: any) => (
				<p key={entry.dataKey} style={{ margin: '4px 0 0', color: entry.color }}>
					{entry.name}: {formatCurrency(entry.value)}
				</p>
			))}
			<p style={{ margin: '4px 0 0', color: 'var(--text-primary, #e0e0e0)' }}>
				Claims: {row.claim_count} | Net Rate: {row.net_recovery_rate.toFixed(1)}%
			</p>
		</div>
	);
}

export default function NetRecoveryLobChart({ data }: Props) {
	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<ResponsiveContainer width="100%" height={350}>
				<BarChart data={data}>
					<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
					<XAxis dataKey="line_of_business" tick={{ fontSize: 12 }} />
					<YAxis tickFormatter={(v: number) => formatCurrency(v)} tick={{ fontSize: 12 }} />
					<Tooltip content={<CustomTooltip />} />
					<Legend />
					<Bar dataKey="payments_out" name="Payments Out" fill="#e57373" />
					<Bar dataKey="expenses" name="Expenses" fill="#ffb74d" />
					<Bar dataKey="recovery_in" name="Recovery In" fill="#81c784" />
				</BarChart>
			</ResponsiveContainer>
		</Card>
	);
}
