'use client';

import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { CoverageCapByCarrier } from '@/hooks/trpc/useFinancialReportingTrpc';

interface Props {
	data: CoverageCapByCarrier[];
}

const cellStyle: React.CSSProperties = {
	padding: '10px 14px',
	borderBottom: '1px solid var(--color-border)',
	fontSize: 13,
};

const headerStyle: React.CSSProperties = {
	...cellStyle,
	fontWeight: 600,
	fontSize: 'var(--text-xs)',
	textTransform: 'uppercase',
	letterSpacing: '0.04em',
	color: 'var(--color-text-secondary)',
	whiteSpace: 'nowrap',
};

export default function CapByCarrierTable({ data }: Props) {
	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<div style={{ overflowX: 'auto' }}>
				<table style={{ width: '100%', borderCollapse: 'collapse' }}>
					<thead>
						<tr>
							<th style={{ ...headerStyle, textAlign: 'left' }}>Carrier</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Settlements</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Cap Constrained</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Cap %</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Total Demanded</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Total Settled</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Over Cap</th>
						</tr>
					</thead>
					<tbody>
						{data.map((row) => {
							const warn = row.cap_constrained_pct > 50;
							const rowBg = warn ? 'rgba(255, 183, 77, 0.08)' : undefined;
							return (
								<tr key={row.party_name} style={{ background: rowBg }}>
									<td style={{ ...cellStyle, textAlign: 'left', fontWeight: 500 }}>
										{row.party_name}
									</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>{row.settlement_count}</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>{row.cap_constrained_count}</td>
									<td
										style={{
											...cellStyle,
											textAlign: 'right',
											color: warn ? 'var(--status-error)' : undefined,
											fontWeight: warn ? 600 : undefined,
										}}
									>
										{row.cap_constrained_pct.toFixed(1)}%
									</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>
										{formatCurrency(row.total_demanded)}
									</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>
										{formatCurrency(row.total_settled)}
									</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>
										{formatCurrency(row.amount_over_cap)}
									</td>
								</tr>
							);
						})}
						{data.length === 0 && (
							<tr>
								<td
									colSpan={7}
									style={{
										...cellStyle,
										textAlign: 'center',
										color: 'var(--color-text-secondary)',
									}}
								>
									No carrier data available
								</td>
							</tr>
						)}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
