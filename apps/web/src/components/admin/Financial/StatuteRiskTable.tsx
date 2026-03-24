'use client';

import Card from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import type { StatuteDeadlineRisk } from '@/hooks/trpc/useFinancialReportingTrpc';

interface StatuteRiskTableProps {
	data: StatuteDeadlineRisk[];
}

const URGENCY_STYLES: Record<string, { bg: string; color: string }> = {
	critical: { bg: '#ffebee', color: '#c62828' },
	warning: { bg: '#fff8e1', color: '#e65100' },
	ok: { bg: '#e8f5e9', color: '#2e7d32' },
};

function formatDate(date: string | Date | null): string {
	if (!date) return '--';
	const d = new Date(date);
	const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}, ${d.getFullYear()}`;
}

function toTitleCase(s: string | null): string {
	if (!s) return '';
	return s
		.split('_')
		.map((w) => w[0].toUpperCase() + w.slice(1))
		.join(' ');
}

const cellStyle: React.CSSProperties = {
	padding: '10px 12px',
	borderBottom: '1px solid #e0e0e0',
	fontSize: 13,
	whiteSpace: 'nowrap',
};

const headerStyle: React.CSSProperties = {
	...cellStyle,
	fontWeight: 600,
	fontSize: 12,
	color: '#666',
	textTransform: 'uppercase',
	letterSpacing: '0.5px',
	background: '#fafafa',
	position: 'sticky',
	top: 0,
};

export default function StatuteRiskTable({ data }: StatuteRiskTableProps) {
	return (
		<Card variant="beveled" padding="none" style={{ padding: '24px' }}>
			<h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>
				Statute Deadline Risk
			</h3>
			<div style={{ overflowX: 'auto', maxHeight: 400 }}>
				<table style={{ width: '100%', borderCollapse: 'collapse' }}>
					<thead>
						<tr>
							<th style={headerStyle}>Claim #</th>
							<th style={headerStyle}>Coverage Type</th>
							<th style={headerStyle}>Statute Date</th>
							<th style={headerStyle}>Days Remaining</th>
							<th style={headerStyle}>Urgency</th>
							<th style={{ ...headerStyle, textAlign: 'right' }}>Expected Recovery</th>
							<th style={headerStyle}>Status</th>
						</tr>
					</thead>
					<tbody>
						{data.length === 0 && (
							<tr>
								<td colSpan={7} style={{ ...cellStyle, textAlign: 'center', color: '#999' }}>
									No statute deadline risks found.
								</td>
							</tr>
						)}
						{data.map((row, i) => {
							const urgency = URGENCY_STYLES[row.urgency] ?? URGENCY_STYLES.ok;
							const isOverdue = row.days_remaining < 0;
							return (
								<tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
									<td style={{ ...cellStyle, fontWeight: 500 }}>{row.claim_number}</td>
									<td style={cellStyle}>{toTitleCase(row.coverage_type)}</td>
									<td style={cellStyle}>{formatDate(row.statute_date)}</td>
									<td style={cellStyle}>
										{isOverdue ? (
											<span
												style={{
													display: 'inline-block',
													padding: '2px 8px',
													borderRadius: 4,
													fontSize: 11,
													fontWeight: 600,
													background: '#c62828',
													color: '#fff',
												}}
											>
												OVERDUE
											</span>
										) : (
											row.days_remaining
										)}
									</td>
									<td style={cellStyle}>
										<span
											style={{
												display: 'inline-block',
												padding: '2px 8px',
												borderRadius: 4,
												fontSize: 11,
												fontWeight: 600,
												background: urgency.bg,
												color: urgency.color,
											}}
										>
											{row.urgency.toUpperCase()}
										</span>
									</td>
									<td style={{ ...cellStyle, textAlign: 'right' }}>
										{formatCurrency(row.expected_recovery)}
									</td>
									<td style={cellStyle}>{toTitleCase(row.recovery_status)}</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>
		</Card>
	);
}
