'use client';

import RecoveryMetricsChart from '@/components/metrics/Recovery/RecoveryMetricsChart';
import KpiCard from '@/components/ui/KpiCard';
import { IconTrendingUp } from '@tabler/icons-react';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { formatCurrency } from '@/lib/utils/recoveryUtils';

export default function FinancialOverview() {
	const { data: quarterData } = useRecoveryTrpc().getQuarterlyRecoveryStats({});

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
			<div style={{ display: 'flex', flexDirection: 'column' }}>
				<h6 style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
					Financial
				</h6>
				<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
					Recovery metrics, trends, and financial performance overview.
				</span>
			</div>

			<RecoveryMetricsChart />

			{quarterData && (
				<div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 24 }}>
					{(['q1', 'q2', 'q3', 'q4'] as const).map((q, i) => {
						const val = parseFloat(quarterData[q] || '0');
						const prevVal = i > 0 ? parseFloat(quarterData[(['q1', 'q2', 'q3', 'q4'] as const)[i - 1]] || '0') : null;
						const pctChange = prevVal && prevVal > 0 ? Math.round(((val - prevVal) / prevVal) * 100) : null;
						return (
							<KpiCard
								key={q}
								icon={<IconTrendingUp size={16} />}
								iconColor={val > 0 ? 'var(--status-success)' : 'var(--text-secondary)'}
								iconBgColor={val > 0 ? 'var(--status-success-bg)' : 'var(--bg-tertiary)'}
								value={formatCurrency(val)}
								label={`Q${i + 1} Recovery`}
								size="sm"
								trend={pctChange !== null ? { value: `${pctChange > 0 ? '+' : ''}${pctChange}%`, isPositive: pctChange >= 0 } : undefined}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
