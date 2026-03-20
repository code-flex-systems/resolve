'use client';

import { Card, CardContent, Grid } from '@mui/material';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DateRange } from '@mui/x-date-pickers-pro';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import { containerStyles } from '@/styles/theme';
import Skeleton from '@/components/ui/Skeleton';

export default function TopPerformersSection({
	range,
	recoveryStatus,
	recoverySource,
	checklistId,
}: {
	range: DateRange<Dayjs>;
	recoveryStatus: string | null;
	recoverySource: string;
	checklistId?: number;
}) {
	// Convert DateRange to ISO strings for tRPC
	const rangeISO = useMemo(
		() =>
			range[0] && range[1] ? ([range[0].toISOString(), range[1].toISOString()] as [string, string]) : undefined,
		[range]
	);

	const filters = useMemo(
		() => ({
			...(rangeISO && { range: rangeISO }),
			...(recoverySource && { recoverySource }),
			...(recoveryStatus && { recoveryStatus: recoveryStatus as any }),
			...(checklistId && { checklistId }),
		}),
		[rangeISO, recoverySource, recoveryStatus, checklistId]
	);

	// Fetch all events for top performers calculation (not paginated for this component)
	const { data = { rows: [], count: 0 }, isFetching } = useRecoveryTrpc().listRecoveryEventsWithFilters(
		{ filters },
		{
			enabled: true,
		}
	);

	const events = data.rows;

	// Calculate top performers
	const topClaims = useMemo(() => {
		const claimTotals = events.reduce(
			(acc, event) => {
				const claimKey = `${event.claim_id}:${event.claim_number}:${event.insured}`;
				if (!acc[claimKey]) {
					acc[claimKey] = {
						claim_number: event.claim_number,
						insured: event.insured,
						total: 0,
					};
				}
				acc[claimKey].total += parseFloat(event.recovery_amount?.toString() || '0');
				return acc;
			},
			{} as Record<string, { claim_number: string | null; insured: string | null; total: number }>
		);

		return Object.values(claimTotals)
			.sort((a, b) => b.total - a.total)
			.slice(0, 5);
	}, [events]);

	const topSources = useMemo(() => {
		const sourceTotals = events.reduce(
			(acc, event) => {
				const source = event.recovery_source || 'Unknown';
				if (!acc[source]) {
					acc[source] = { source, total: 0, count: 0 };
				}
				acc[source].total += parseFloat(event.recovery_amount?.toString() || '0');
				acc[source].count += 1;
				return acc;
			},
			{} as Record<string, { source: string; total: number; count: number }>
		);

		return Object.values(sourceTotals)
			.sort((a, b) => b.total - a.total)
			.slice(0, 5);
	}, [events]);

	if (isFetching) {
		return (
			<div style={{ ...styles.paper, ...containerStyles.beveledCard }}>
				<Skeleton variant="text" width={150} height={32} />
				<Grid container spacing={3}>
					<Grid size={6}>
						<Skeleton variant="rect" height={250} />
					</Grid>
					<Grid size={6}>
						<Skeleton variant="rect" height={250} />
					</Grid>
				</Grid>
			</div>
		);
	}

	return (
		<div style={{ ...styles.paper, ...containerStyles.beveledCard }}>
			<span style={{ fontSize: 18, fontWeight: 600, marginBottom: 16 }}>
				Top Performers
			</span>

			<Grid container spacing={3}>
				{/* Top Claims by Recovery Amount */}
				<Grid size={6}>
					<Card variant="outlined">
						<CardContent>
							<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
								Top Claims by Recovery Amount
							</span>
							{topClaims.length === 0 ? (
								<span style={{ fontSize: 12, color: 'text.secondary' }}>
									No data available
								</span>
							) : (
								topClaims.map((claim, index) => (
									<div
key={index}
										
										
										
										
										 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
										<div>
											<span style={{ fontSize: 13, fontWeight: 500 }}>
												{claim.claim_number || 'N/A'}
											</span>
											<span style={{ fontSize: 11, color: 'text.secondary' }}>
												{claim.insured || 'Unknown'}
											</span>
										</div>
										<span style={{ fontSize: 14, fontWeight: 600, color: 'success.main' }}>
											{formatCurrency(claim.total)}
										</span>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</Grid>

				{/* Top Sources by Recovery Amount */}
				<Grid size={6}>
					<Card variant="outlined">
						<CardContent>
							<span style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>
								Top Sources by Recovery Amount
							</span>
							{topSources.length === 0 ? (
								<span style={{ fontSize: 12, color: 'text.secondary' }}>
									No data available
								</span>
							) : (
								topSources.map((source, index) => (
									<div
key={index}
										
										
										
										
										 style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, paddingBottom: 8 }}>
										<div style={{ flex: 1 }}>
											<span style={{ fontSize: 13, fontWeight: 500 }}>
												{source.source}
											</span>
											<span style={{ fontSize: 11, color: 'text.secondary' }}>
												{source.count} event{source.count !== 1 ? 's' : ''}
											</span>
										</div>
										<span style={{ fontSize: 14, fontWeight: 600, color: 'primary.main' }}>
											{formatCurrency(source.total)}
										</span>
									</div>
								))
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</div>
	);
}

const styles = {
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		width: '100%',
		padding: '24px',
	},
};
