'use client';
import Skeleton from '@/components/ui/Skeleton';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import type { RecoverySummaryByCoverage } from '@/hooks/trpc/useRecoveryTrpc';

interface RecoverySummaryTableProps {
	data: RecoverySummaryByCoverage[];
	ourLiabilityPercentage: number;
	isLoading?: boolean;
}

export default function RecoverySummaryTable({
	data,
	ourLiabilityPercentage,
	isLoading,
}: RecoverySummaryTableProps) {
	// Calculate derived values for each coverage
	const coverageRows = data.map((coverage) => {
		const amount = parseFloat(coverage.subrogable_amount) || 0;
		const actualRecovery = parseFloat(coverage.actual_recovery) || 0;
		const expectedRecovery = amount * (ourLiabilityPercentage / 100);
		const balance = expectedRecovery - actualRecovery;
		const rate = expectedRecovery > 0 ? (actualRecovery / expectedRecovery) * 100 : 0;

		return {
			coverage_id: coverage.coverage_id,
			loss_type: coverage.loss_type,
			amount,
			expectedRecovery,
			actualRecovery,
			balance,
			rate,
		};
	});

	// Calculate totals
	const totals = coverageRows.reduce(
		(acc, row) => ({
			amount: acc.amount + row.amount,
			expectedRecovery: acc.expectedRecovery + row.expectedRecovery,
			actualRecovery: acc.actualRecovery + row.actualRecovery,
			balance: acc.balance + row.balance,
		}),
		{ amount: 0, expectedRecovery: 0, actualRecovery: 0, balance: 0 }
	);

	const totalRate =
		totals.expectedRecovery > 0 ? (totals.actualRecovery / totals.expectedRecovery) * 100 : 0;

	if (isLoading) {
		return (
			<div>
				<Skeleton variant="rect" height={120} />
			</div>
		);
	}

	if (data.length === 0) {
		return (
			<span
				style={{
					fontSize: 'var(--text-xs)',
					color: 'var(--text-secondary)',
					fontStyle: 'italic',
					textAlign: 'center',
					paddingTop: 16,
					paddingBottom: 16,
				}}
			>
				No coverage data available
			</span>
		);
	}

	return (
		<div style={{ overflowX: 'auto' }}>
			<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
				<thead>
					<tr>
						<th
							style={{
								textAlign: 'left',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Coverage
						</th>
						<th
							style={{
								textAlign: 'right',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Amount
						</th>
						<th
							style={{
								textAlign: 'right',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Expected
							<br />
							Recovery
						</th>
						<th
							style={{
								textAlign: 'right',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Actual
							<br />
							Recovery
						</th>
						<th
							style={{
								textAlign: 'right',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Expected
							<br />
							Recovery Balance
						</th>
						<th
							style={{
								textAlign: 'right',
								fontWeight: 600,
								fontSize: 'var(--text-xs)',
								color: 'var(--text-secondary)',
								textTransform: 'uppercase',
								letterSpacing: '0.04em',
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
							}}
						>
							Recovery
							<br />
							Rate
						</th>
					</tr>
				</thead>
				<tbody>
					{coverageRows.map((row) => (
						<tr key={row.coverage_id}>
							<td style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
								{formatCoverageType(row.loss_type)}
							</td>
							<td
								style={{
									padding: '8px 12px',
									borderBottom: '1px solid var(--border)',
									textAlign: 'right',
								}}
							>
								{formatCurrencyExact(row.amount)}
							</td>
							<td
								style={{
									padding: '8px 12px',
									borderBottom: '1px solid var(--border)',
									textAlign: 'right',
								}}
							>
								{formatCurrencyExact(row.expectedRecovery)}
							</td>
							<td
								style={{
									padding: '8px 12px',
									borderBottom: '1px solid var(--border)',
									textAlign: 'right',
									color: 'var(--status-success)',
								}}
							>
								{formatCurrencyExact(row.actualRecovery)}
							</td>
							<td
								style={{
									padding: '8px 12px',
									borderBottom: '1px solid var(--border)',
									textAlign: 'right',
								}}
							>
								{formatCurrencyExact(row.balance)}
							</td>
							<td
								style={{
									padding: '8px 12px',
									borderBottom: '1px solid var(--border)',
									textAlign: 'right',
								}}
							>
								{row.expectedRecovery > 0 ? `${Math.round(row.rate)}%` : '—'}
							</td>
						</tr>
					))}
					{/* Totals row */}
					<tr>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								fontWeight: 700,
								color: 'var(--text-accent)',
							}}
						>
							Totals
						</td>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								textAlign: 'right',
								fontWeight: 700,
							}}
						>
							{formatCurrencyExact(totals.amount)}
						</td>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								textAlign: 'right',
								fontWeight: 700,
							}}
						>
							{formatCurrencyExact(totals.expectedRecovery)}
						</td>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								textAlign: 'right',
								fontWeight: 700,
								color: 'var(--status-success)',
							}}
						>
							{formatCurrencyExact(totals.actualRecovery)}
						</td>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								textAlign: 'right',
								fontWeight: 700,
							}}
						>
							{formatCurrencyExact(totals.balance)}
						</td>
						<td
							style={{
								padding: '8px 12px',
								borderBottom: '1px solid var(--border)',
								textAlign: 'right',
								fontWeight: 700,
							}}
						>
							{totals.expectedRecovery > 0 ? `${Math.round(totalRate)}%` : '—'}
						</td>
					</tr>
				</tbody>
			</table>
		</div>
	);
}
