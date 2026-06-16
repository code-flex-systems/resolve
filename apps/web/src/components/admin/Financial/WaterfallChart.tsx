'use client';

import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { VarianceDecompositionItem } from '@/hooks/trpc/useFinancialReportingTrpc';

interface WaterfallChartProps {
	data: VarianceDecompositionItem[];
}

const CATEGORY_CONFIG: Record<string, { color: string; description: string }> = {
	'Closed - No Recovery': {
		color: '#e57373',
		description: 'Claims closed without any recovery',
	},
	'Pending - Not Started': {
		color: '#90a4ae',
		description: 'Recovery not yet initiated',
	},
	'In Progress - Outstanding': {
		color: '#ffb74d',
		description: 'Active recovery not yet fully collected',
	},
	'Recovered - Shortfall': {
		color: '#ff8a65',
		description: 'Recovered less than expected',
	},
};

export default function WaterfallChart({ data }: WaterfallChartProps) {
	const totalVariance = data.reduce((sum, d) => sum + d.value, 0);
	const maxValue = Math.max(...data.map((d) => d.value), 1);

	if (data.length === 0 || totalVariance === 0) {
		return (
			<div style={{ padding: 24, textAlign: 'center', color: 'var(--text-secondary, #999)' }}>
				No variance to display — all claims fully recovered.
			</div>
		);
	}

	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'baseline',
					padding: '0 4px',
				}}
			>
				<span style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--text-secondary, #999)' }}>
					Unrecovered Amount by Status
				</span>
				<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--status-error)' }}>
					{formatCurrency(totalVariance)} total
				</span>
			</div>

			{data
				.filter((item) => item.value > 0)
				.map((item) => {
					const config = CATEGORY_CONFIG[item.name];
					const barWidth = Math.min((item.value / maxValue) * 100, 100);

					return (
						<div
							key={item.name}
							style={{
								display: 'flex',
								alignItems: 'center',
								gap: 12,
								padding: '10px 12px',
								borderRadius: 6,
								background: 'var(--bg-secondary, #1e1e1e)',
							}}
						>
							<div style={{ width: 180, flexShrink: 0 }}>
								<div style={{ fontSize: 13, fontWeight: 500 }}>{item.name}</div>
								<div style={{ fontSize: 11, color: 'var(--text-secondary, #999)' }}>
									{config?.description ?? ''}
								</div>
								<div style={{ fontSize: 11, color: 'var(--text-secondary, #999)', marginTop: 2 }}>
									{item.count} claim{item.count !== 1 ? 's' : ''}
								</div>
							</div>
							<div
								style={{
									flex: 1,
									height: 8,
									background: 'var(--bg-tertiary, #2a2a2a)',
									borderRadius: 4,
									overflow: 'hidden',
								}}
							>
								<div
									style={{
										width: `${barWidth}%`,
										height: '100%',
										background: config?.color ?? '#e57373',
										borderRadius: 4,
										transition: 'width 0.3s ease',
									}}
								/>
							</div>
							<div
								style={{
									width: 100,
									textAlign: 'right',
									fontSize: 14,
									fontWeight: 600,
									color: config?.color ?? '#e57373',
									flexShrink: 0,
								}}
							>
								{formatCurrency(item.value)}
							</div>
						</div>
					);
				})}

			<div
				style={{
					fontSize: 11,
					color: 'var(--text-tertiary, #666)',
					padding: '4px 4px 0',
					fontStyle: 'italic',
				}}
			>
				Based on claims created within the selected date range
			</div>
		</div>
	);
}
