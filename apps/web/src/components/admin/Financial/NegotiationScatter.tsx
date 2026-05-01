'use client';

import {
	ScatterChart,
	Scatter,
	XAxis,
	YAxis,
	ZAxis,
	Tooltip,
	ResponsiveContainer,
	ReferenceLine,
} from 'recharts';
import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { NegotiationEfficiencyPoint } from '@/hooks/trpc/useFinancialReportingTrpc';

interface NegotiationScatterProps {
	data: NegotiationEfficiencyPoint[];
}

export default function NegotiationScatter({ data }: NegotiationScatterProps) {
	const constrained = data.filter((d) => d.cap_constrained);
	const unconstrained = data.filter((d) => !d.cap_constrained);

	// Compute max for reference line
	const maxVal = Math.max(...data.map((d) => Math.max(d.demand, d.settled)), 0);

	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<ResponsiveContainer width="100%" height={250}>
				<ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
					<XAxis
						dataKey="demand"
						type="number"
						name="Demand"
						tickFormatter={(v: number) => formatCurrency(v)}
						tick={{ fontSize: 11 }}
					/>
					<YAxis
						dataKey="settled"
						type="number"
						name="Settled"
						tickFormatter={(v: number) => formatCurrency(v)}
						tick={{ fontSize: 11 }}
					/>
					<ZAxis dataKey="days_to_settle" range={[40, 400]} name="Days" />
					<Tooltip
						content={({ active, payload }) => {
							if (!active || !payload?.length) return null;
							const d = payload[0].payload as NegotiationEfficiencyPoint;
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
									<div style={{ fontWeight: 600, marginBottom: 4 }}>{d.claim_number}</div>
									<div>Party: {d.party_name}</div>
									<div>Demand: {formatCurrency(d.demand)}</div>
									<div>Settled: {formatCurrency(d.settled)}</div>
									<div>Recovery: {d.recovery_pct}%</div>
									<div>Days: {d.days_to_settle}</div>
								</div>
							);
						}}
					/>
					<ReferenceLine
						segment={[
							{ x: 0, y: 0 },
							{ x: maxVal, y: maxVal },
						]}
						stroke="#bdbdbd"
						strokeDasharray="4 4"
						label={{ value: 'Full Recovery', position: 'insideTopLeft', fontSize: 10 }}
					/>
					<Scatter name="Unconstrained" data={unconstrained} fill="#4fc3f7" />
					<Scatter name="Cap Constrained" data={constrained} fill="#e57373" />
				</ScatterChart>
			</ResponsiveContainer>
			<div
				style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 12 }}
			>
				<span>
					<span
						style={{
							display: 'inline-block',
							width: 10,
							height: 10,
							borderRadius: '50%',
							background: '#4fc3f7',
							marginRight: 4,
						}}
					/>
					Unconstrained
				</span>
				<span>
					<span
						style={{
							display: 'inline-block',
							width: 10,
							height: 10,
							borderRadius: '50%',
							background: '#e57373',
							marginRight: 4,
						}}
					/>
					Cap Constrained
				</span>
			</div>
		</Card>
	);
}
