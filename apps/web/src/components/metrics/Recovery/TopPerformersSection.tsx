'use client';

import { Box, Card, CardContent, Grid, Paper, Skeleton, Typography } from '@mui/material';
import { useRecoveryTrpc } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DateRange } from '@mui/x-date-pickers-pro';
import { formatCurrency } from '@/lib/utils/recoveryUtils';
import { containerStyles } from '@/styles/theme';

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
			<Paper elevation={0} sx={{ ...styles.paper, ...containerStyles.beveledCard }}>
				<Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
				<Grid container spacing={3}>
					<Grid size={6}>
						<Skeleton variant="rounded" height={250} />
					</Grid>
					<Grid size={6}>
						<Skeleton variant="rounded" height={250} />
					</Grid>
				</Grid>
			</Paper>
		);
	}

	return (
		<Paper elevation={0} sx={{ ...styles.paper, ...containerStyles.beveledCard }}>
			<Typography variant="h6" fontSize={18} fontWeight={600} mb={2}>
				Top Performers
			</Typography>

			<Grid container spacing={3}>
				{/* Top Claims by Recovery Amount */}
				<Grid size={6}>
					<Card variant="outlined">
						<CardContent>
							<Typography fontSize={14} fontWeight={600} mb={2}>
								Top Claims by Recovery Amount
							</Typography>
							{topClaims.length === 0 ? (
								<Typography fontSize={12} color="text.secondary">
									No data available
								</Typography>
							) : (
								topClaims.map((claim, index) => (
									<Box
										key={index}
										display="flex"
										justifyContent="space-between"
										alignItems="center"
										py={1}
										borderBottom={index < topClaims.length - 1 ? '1px solid #E0E0E0' : 'none'}
									>
										<Box>
											<Typography fontSize={13} fontWeight={500}>
												{claim.claim_number || 'N/A'}
											</Typography>
											<Typography fontSize={11} color="text.secondary">
												{claim.insured || 'Unknown'}
											</Typography>
										</Box>
										<Typography fontSize={14} fontWeight={600} color="success.main">
											{formatCurrency(claim.total)}
										</Typography>
									</Box>
								))
							)}
						</CardContent>
					</Card>
				</Grid>

				{/* Top Sources by Recovery Amount */}
				<Grid size={6}>
					<Card variant="outlined">
						<CardContent>
							<Typography fontSize={14} fontWeight={600} mb={2}>
								Top Sources by Recovery Amount
							</Typography>
							{topSources.length === 0 ? (
								<Typography fontSize={12} color="text.secondary">
									No data available
								</Typography>
							) : (
								topSources.map((source, index) => (
									<Box
										key={index}
										display="flex"
										justifyContent="space-between"
										alignItems="center"
										py={1}
										borderBottom={index < topSources.length - 1 ? '1px solid #E0E0E0' : 'none'}
									>
										<Box flex={1}>
											<Typography fontSize={13} fontWeight={500}>
												{source.source}
											</Typography>
											<Typography fontSize={11} color="text.secondary">
												{source.count} event{source.count !== 1 ? 's' : ''}
											</Typography>
										</Box>
										<Typography fontSize={14} fontWeight={600} color="primary.main">
											{formatCurrency(source.total)}
										</Typography>
									</Box>
								))
							)}
						</CardContent>
					</Card>
				</Grid>
			</Grid>
		</Paper>
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
