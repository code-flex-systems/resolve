'use client';

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Line } from 'recharts';
import Card from '@/components/ui/Card';
import type { PaymentToRecoveryTimeline } from '@/hooks/trpc/useFinancialReportingTrpc';

interface CycleTimeChartProps {
	data: PaymentToRecoveryTimeline[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function formatPeriod(period: string): string {
	const [year, month] = period.split('-');
	const idx = parseInt(month, 10) - 1;
	return `${MONTHS[idx]} ${year}`;
}

export default function CycleTimeChart({ data }: CycleTimeChartProps) {
	const chartData = data.map((d) => ({
		...d,
		periodLabel: formatPeriod(d.period),
	}));

	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<ResponsiveContainer width="100%" height={350}>
				<AreaChart data={chartData} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
					<XAxis dataKey="periodLabel" tick={{ fontSize: 11 }} />
					<YAxis
						tick={{ fontSize: 11 }}
						domain={[0, 'auto']}
						label={{ value: 'Days', angle: -90, position: 'insideLeft', fontSize: 12 }}
					/>
					<Tooltip
						content={({ active, payload, label }) => {
							if (!active || !payload?.length) return null;
							const d = payload[0].payload as PaymentToRecoveryTimeline & { periodLabel: string };
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
									<div style={{ fontWeight: 600, marginBottom: 4 }}>{label}</div>
									<div>Avg Days: {d.avg_days_to_first_recovery}</div>
									<div>Median Days: {d.median_days}</div>
									<div>Claims: {d.claim_count}</div>
								</div>
							);
						}}
					/>
					<Area
						type="monotone"
						dataKey="avg_days_to_first_recovery"
						stroke="#4fc3f7"
						fill="#4fc3f7"
						fillOpacity={0.2}
						name="Avg Days"
					/>
					<Line
						type="monotone"
						dataKey="median_days"
						stroke="#ba68c8"
						strokeDasharray="6 3"
						dot={false}
						name="Median Days"
					/>
				</AreaChart>
			</ResponsiveContainer>
			<div
				style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 8, fontSize: 12 }}
			>
				<span>
					<span
						style={{
							display: 'inline-block',
							width: 16,
							height: 2,
							background: '#4fc3f7',
							marginRight: 4,
							verticalAlign: 'middle',
						}}
					/>
					Avg Days
				</span>
				<span>
					<span
						style={{
							display: 'inline-block',
							width: 16,
							height: 2,
							background: '#ba68c8',
							borderTop: '2px dashed #ba68c8',
							marginRight: 4,
							verticalAlign: 'middle',
						}}
					/>
					Median Days
				</span>
			</div>
		</Card>
	);
}
