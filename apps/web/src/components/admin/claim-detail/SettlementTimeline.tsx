'use client';

import { Box, Chip, Collapse, Paper, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import { useMemo, useState } from 'react';
import Highlight from '@/components/common/Highlight';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { BASE_COLOR_LIGHT, BORDER_COLOR, containerStyles } from '@/styles/theme';
import { SettlementStatus } from '@/config/enums';
import dayjs from 'dayjs';

const capitalize = (str: string | null | undefined) => {
	if (!str) return '';
	return str.charAt(0).toUpperCase() + str.slice(1);
};

const getStatusColor = (status: string) => {
	switch (status) {
		case SettlementStatus.SETTLED:
			return 'success';
		case SettlementStatus.CLOSED:
			return 'default';
		default:
			return 'warning';
	}
};

type TimelineItem =
	| { type: 'settlement'; date: Date; data: any; settlementId: number }
	| { type: 'recovery'; date: Date; data: any; settlementId: number };

interface SettlementTimelineProps {
	settlements: any[];
	recoveryEvents: any[];
	isManageMode: boolean;
	onEditSettlement: (settlement: any) => void;
	onEditRecovery: (recovery: any) => void;
	onArchiveSettlement: (settlement: any) => void;
	onArchiveRecovery: (recovery: any) => void;
}

export default function SettlementTimeline({
	settlements,
	recoveryEvents,
	isManageMode,
	onEditSettlement,
	onEditRecovery,
	onArchiveSettlement,
	onArchiveRecovery,
}: SettlementTimelineProps) {
	const [activeSettlementId, setActiveSettlementId] = useState<number | null>(null);

	const timeline = useMemo<TimelineItem[]>(() => {
		const items: TimelineItem[] = [
			...settlements.map((s) => ({
				type: 'settlement' as const,
				date: s.demand_date,
				data: s,
				settlementId: s.id,
			})),
			...recoveryEvents.map((r) => ({
				type: 'recovery' as const,
				date: r.recovery_date,
				data: r,
				settlementId: r.settlement_id,
			})),
		];
		return items.sort((a, b) => {
			const dateDiff = dayjs(b.date).valueOf() - dayjs(a.date).valueOf();
			if (dateDiff !== 0) return dateDiff;
			return dayjs(b.data.created_at).valueOf() - dayjs(a.data.created_at).valueOf();
		});
	}, [settlements, recoveryEvents]);

	const getSettlementForRecovery = (settlementId: number) => {
		return settlements.find((s) => s.id === settlementId);
	};

	const handleItemClick = (settlementId: number) => {
		setActiveSettlementId((prev) => (prev === settlementId ? null : settlementId));
	};

	const isItemActive = (item: TimelineItem) => {
		return activeSettlementId !== null && item.settlementId === activeSettlementId;
	};

	return (
		<Box>
			{timeline.map((item, index) => {
				const isSettlement = item.type === 'settlement';
				const settlement = isSettlement ? item.data : null;
				const recovery = !isSettlement ? item.data : null;
				const relatedSettlement = !isSettlement ? getSettlementForRecovery(item.settlementId) : null;
				const isActive = isItemActive(item);
				const isGrayedOut = activeSettlementId !== null && !isActive;
				const isLastItem = index === timeline.length - 1;

				return (
					<Box key={`${item.type}-${item.data.id}`} display="flex">
						{/* Left column: indicator and connector */}
						<Box display="flex" flexDirection="column" alignItems="center" sx={{ width: 24, flexShrink: 0 }}>
							<Box
								sx={{
									width: 12,
									height: 12,
									borderRadius: '50%',
									bgcolor: isSettlement ? 'warning.main' : 'success.main',
									opacity: isGrayedOut ? 0.4 : 1,
									transition: 'opacity 0.3s ease',
									flexShrink: 0,
								}}
							/>
							{!isLastItem && (
								<Box
									sx={{
										flex: 1,
										minHeight: 16,
										width: 0,
										borderLeft: `1px dashed ${BORDER_COLOR}`,
									}}
								/>
							)}
						</Box>

						{/* Right column: content */}
						<Box
							flex={1}
							sx={{
								pl: 2,
								pb: isLastItem ? 0 : 2,
								opacity: isGrayedOut ? 0.4 : 1,
								transition: 'opacity 0.3s ease',
							}}
						>
							{/* Summary row - clickable */}
							<Box display="flex" justifyContent="space-between" alignItems="flex-start">
								<Box
									onClick={() => handleItemClick(item.settlementId)}
									sx={{
										cursor: 'pointer',
										'&:hover': { bgcolor: 'action.hover' },
										borderRadius: 1,
										p: 1,
										ml: -1,
										flex: 1,
									}}
								>
									<Box display="flex" justifyContent="space-between" alignItems="center">
										<Box>
											<Typography fontSize={14} fontWeight={600}>
												{dayjs(item.date).format('MMM D')}
											</Typography>
											{isSettlement ? (
												<Typography fontSize={12} color="text.secondary">
													{settlement.party_name}
													{settlement.loss_type && <> · {formatCoverageType(settlement.loss_type)}</>}
												</Typography>
											) : (
												<Typography fontSize={12} color="text.secondary">
													{recovery.recovery_source || 'No source'}
													{relatedSettlement && (
														<>
															{' '}· {relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)}
														</>
													)}
												</Typography>
											)}
											<Typography
												fontSize={13}
												fontWeight={600}
												color={isSettlement ? 'warning.main' : 'success.main'}
											>
												{isSettlement
													? formatCurrencyExact(parseFloat(settlement.demand_amount.toString()))
													: formatCurrencyExact(parseFloat(recovery.recovery_amount.toString()))}
											</Typography>
										</Box>
										{isSettlement && (
											<Chip label={capitalize(settlement.status)} size="small" color={getStatusColor(settlement.status)} />
										)}
									</Box>
								</Box>
								{/* Edit/Archive buttons */}
								{isManageMode && (
									<Box display="flex" gap={0.5} ml={1}>
										<BasicButtonStyled
											buttonProps={{
												onClick: () => (isSettlement ? onEditSettlement(settlement) : onEditRecovery(recovery)),
											}}
											tooltipProps={{ title: `Edit ${isSettlement ? 'settlement' : 'recovery'}` }}
											icon={<Edit />}
											compact
										/>
										<BasicButtonStyled
											buttonProps={{
												onClick: () =>
													isSettlement ? onArchiveSettlement(settlement) : onArchiveRecovery(recovery),
											}}
											tooltipProps={{ title: `Archive ${isSettlement ? 'settlement' : 'recovery'}` }}
											icon={<Archive sx={{ color: 'error.main' }} />}
											compact
										/>
									</Box>
								)}
							</Box>

							{/* Expanded details */}
							<Collapse in={isActive} timeout={300}>
								<Box sx={{ mt: 1 }}>
									<Paper elevation={0} sx={styles.detailCard}>
										{isSettlement ? (
											<SettlementDetails settlement={settlement} />
										) : (
											<RecoveryDetails recovery={recovery} relatedSettlement={relatedSettlement} />
										)}
									</Paper>
								</Box>
							</Collapse>
						</Box>
					</Box>
				);
			})}
		</Box>
	);
}

function SettlementDetails({ settlement }: { settlement: any }) {
	return (
		<>
			<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
				Settlement Details
			</Typography>
			<Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Party</Typography>
					<Typography fontSize={13}><Highlight>{settlement.party_name}</Highlight></Typography>
				</Box>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Coverage</Typography>
					<Typography fontSize={13}><Highlight>{formatCoverageType(settlement.loss_type)}</Highlight></Typography>
				</Box>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Demand Amount</Typography>
					<Typography fontSize={13} fontWeight={600} color="warning.main">
						{formatCurrencyExact(parseFloat(settlement.demand_amount.toString()))}
					</Typography>
				</Box>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Demand Date</Typography>
					<Typography fontSize={13}>{dayjs(settlement.demand_date).format('MMM D, YYYY')}</Typography>
				</Box>
				{settlement.settlement_amount && (
					<Box>
						<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Settlement Amount</Typography>
						<Typography fontSize={13} fontWeight={600} color="success.main">
							{formatCurrencyExact(parseFloat(settlement.settlement_amount.toString()))}
						</Typography>
					</Box>
				)}
				{settlement.agreed_liability_percentage && (
					<Box>
						<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Agreed Liability</Typography>
						<Typography fontSize={13}>{settlement.agreed_liability_percentage}%</Typography>
					</Box>
				)}
				{settlement.settlement_date && (
					<Box>
						<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Settlement Date</Typography>
						<Typography fontSize={13}>{dayjs(settlement.settlement_date).format('MMM D, YYYY')}</Typography>
					</Box>
				)}
			</Box>
			{settlement.notes && (
				<Box mt={2}>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Notes</Typography>
					<Typography fontSize={13} color="text.secondary">{settlement.notes}</Typography>
				</Box>
			)}
		</>
	);
}

function RecoveryDetails({ recovery, relatedSettlement }: { recovery: any; relatedSettlement: any }) {
	return (
		<>
			<Typography fontSize={12} color={BASE_COLOR_LIGHT} marginBottom={1}>
				Recovery Details
			</Typography>
			<Box display="grid" gridTemplateColumns="1fr 1fr" gap={2}>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Amount</Typography>
					<Typography fontSize={13} fontWeight={600} color="success.main">
						{formatCurrencyExact(parseFloat(recovery.recovery_amount.toString()))}
					</Typography>
				</Box>
				<Box>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Date</Typography>
					<Typography fontSize={13}>{dayjs(recovery.recovery_date).format('MMM D, YYYY')}</Typography>
				</Box>
				{recovery.recovery_source && (
					<Box>
						<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Source</Typography>
						<Typography fontSize={13}><Highlight>{recovery.recovery_source}</Highlight></Typography>
					</Box>
				)}
				{relatedSettlement && (
					<Box>
						<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Settlement</Typography>
						<Typography fontSize={13}>
							{relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)} ·{' '}
							{formatCurrencyExact(parseFloat(relatedSettlement.demand_amount.toString()))}
						</Typography>
					</Box>
				)}
			</Box>
			{recovery.notes && (
				<Box mt={2}>
					<Typography fontSize={11} color={BASE_COLOR_LIGHT}>Notes</Typography>
					<Typography fontSize={13} color="text.secondary">{recovery.notes}</Typography>
				</Box>
			)}
		</>
	);
}

const styles = {
	detailCard: {
		...containerStyles.beveledCard,
		padding: '16px',
		backgroundColor: '#fafafa',
	},
};
