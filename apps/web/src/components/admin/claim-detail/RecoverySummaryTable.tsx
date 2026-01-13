'use client';

import {
	Box,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from '@mui/material';
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

	const totalRate = totals.expectedRecovery > 0
		? (totals.actualRecovery / totals.expectedRecovery) * 100
		: 0;

	if (isLoading) {
		return (
			<Box>
				<Skeleton variant="rectangular" height={120} />
			</Box>
		);
	}

	if (data.length === 0) {
		return (
			<Typography fontSize={12} color="text.secondary" fontStyle="italic" textAlign="center" py={2}>
				No coverage data available
			</Typography>
		);
	}

	return (
		<TableContainer>
			<Table size="small" sx={{ '& td, & th': { fontSize: 12, py: 1, px: 1.5 } }}>
				<TableHead>
					<TableRow>
						<TableCell sx={{ fontWeight: 600, color: 'text.secondary' }}>Coverage</TableCell>
						<TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>Amount</TableCell>
						<TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
							Expected
							<br />
							Recovery
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
							Actual
							<br />
							Recovery
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
							Expected
							<br />
							Recovery Balance
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 600, color: 'text.secondary' }}>
							Recovery
							<br />
							Rate
						</TableCell>
					</TableRow>
				</TableHead>
				<TableBody>
					{coverageRows.map((row) => (
						<TableRow key={row.coverage_id}>
							<TableCell>{formatCoverageType(row.loss_type)}</TableCell>
							<TableCell align="right">{formatCurrencyExact(row.amount)}</TableCell>
							<TableCell align="right">{formatCurrencyExact(row.expectedRecovery)}</TableCell>
							<TableCell align="right" sx={{ color: 'success.main' }}>
								{formatCurrencyExact(row.actualRecovery)}
							</TableCell>
							<TableCell align="right">{formatCurrencyExact(row.balance)}</TableCell>
							<TableCell align="right">
								{row.expectedRecovery > 0 ? `${Math.round(row.rate)}%` : '—'}
							</TableCell>
						</TableRow>
					))}
					{/* Totals row */}
					<TableRow sx={{ '& td': { borderTop: '2px solid', borderColor: 'divider' } }}>
						<TableCell sx={{ fontWeight: 700, color: 'primary.main' }}>Totals</TableCell>
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							{formatCurrencyExact(totals.amount)}
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							{formatCurrencyExact(totals.expectedRecovery)}
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 700, color: 'success.main' }}>
							{formatCurrencyExact(totals.actualRecovery)}
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							{formatCurrencyExact(totals.balance)}
						</TableCell>
						<TableCell align="right" sx={{ fontWeight: 700 }}>
							{totals.expectedRecovery > 0 ? `${Math.round(totalRate)}%` : '—'}
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</TableContainer>
	);
}
