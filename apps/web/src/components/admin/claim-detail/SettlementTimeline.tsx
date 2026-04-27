'use client';

import { IconArchive, IconCalendarRepeat, IconCash, IconEdit } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Collapse from '@/components/ui/Collapse';
import { useMemo, useState } from 'react';
import Highlight from '@/components/common/Highlight';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { SettlementStructure, PaymentFrequency } from '@/config/enums';
import dayjs from 'dayjs';
import Button from '@/components/ui/Button';

const formatPaymentFrequency = (frequency: string | null | undefined) => {
	switch (frequency) {
		case PaymentFrequency.WEEKLY:
			return 'Weekly';
		case PaymentFrequency.BI_WEEKLY:
			return 'Bi-Weekly';
		case PaymentFrequency.MONTHLY:
			return 'Monthly';
		case PaymentFrequency.QUARTERLY:
			return 'Quarterly';
		default:
			return frequency || '';
	}
};

function SettlementStructureIcon({ structure }: { structure: string | null | undefined }) {
	if (!structure) return null;
	const isPaymentPlan = structure === SettlementStructure.PAYMENT_PLAN;
	return (
		<Tooltip content={isPaymentPlan ? 'Payment Plan' : 'Lump Sum'}>
			{isPaymentPlan ? (
				<IconCalendarRepeat size={16} style={{ color: 'var(--text-accent)' }} />
			) : (
				<IconCash size={16} style={{ color: 'var(--text-secondary)' }} />
			)}
		</Tooltip>
	);
}

type TimelineItem =
	| { type: 'settlement'; date: Date; data: any; settlementId: string }
	| { type: 'recovery'; date: Date; data: any; settlementId: string };

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
	const [activeSettlementId, setActiveSettlementId] = useState<string | null>(null);

	const settlementMap = useMemo(
		() => new Map(settlements.map((s) => [s.id, s])),
		[settlements]
	);

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

	const handleItemClick = (settlementId: string) => {
		setActiveSettlementId((prev) => (prev === settlementId ? null : settlementId));
	};

	const isItemActive = (item: TimelineItem) => {
		return activeSettlementId !== null && item.settlementId === activeSettlementId;
	};

	return (
		<div>
			{timeline.map((item, index) => {
				const isSettlement = item.type === 'settlement';
				const settlement = isSettlement ? item.data : null;
				const recovery = !isSettlement ? item.data : null;
				const relatedSettlement = !isSettlement ? settlementMap.get(item.settlementId) : null;
				const isActive = isItemActive(item);
				const isGrayedOut = activeSettlementId !== null && !isActive;
				const isLastItem = index === timeline.length - 1;

				return (
					<div key={`${item.type}-${index}`} style={{ display: 'flex' }}>
						{/* Left column: indicator and connector */}
						<div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, flexShrink: 0 }}>
							<div
								style={{
									width: 12,
									height: 12,
									borderRadius: '50%',
									backgroundColor: isSettlement ? 'var(--status-warning)' : 'var(--status-success)',
									opacity: isGrayedOut ? 0.4 : 1,
									transition: 'opacity 0.3s ease',
									flexShrink: 0,
								}}
							/>
							{!isLastItem && (
								<div
									style={{
										flex: 1,
										minHeight: 16,
										width: 0,
										borderLeft: '1px dashed var(--border)',
									}}
								/>
							)}
						</div>

						{/* Right column: content */}
						<div
							style={{
								flex: 1,
								paddingLeft: 16,
								paddingBottom: isLastItem ? 0 : 16,
								opacity: isGrayedOut ? 0.4 : 1,
								transition: 'opacity 0.3s ease',
							}}
						>
							{/* Summary row - clickable */}
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div
									onClick={() => handleItemClick(item.settlementId)}
									style={{ cursor: 'pointer', borderRadius: 4, padding: 8, marginLeft: -8, flex: 1 }}
								>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
											<span style={{ fontSize: 14, fontWeight: 600 }}>
												{dayjs(item.date).format('MMM D')}
											</span>
											{isSettlement ? (
												<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
													{settlement.party_name}
													{settlement.loss_type && <> · {formatCoverageType(settlement.loss_type)}</>}
												</span>
											) : (
												<span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
													{recovery.recovery_source || 'No source'}
													{relatedSettlement && (
														<> · {relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)}</>
													)}
												</span>
											)}
											<span style={{ fontSize: 13, fontWeight: 600 }}>
												{isSettlement
													? formatCurrencyExact(parseFloat(settlement.demand_amount.toString()))
													: formatCurrencyExact(parseFloat(recovery.recovery_amount.toString()))}
											</span>
										</div>
										{isSettlement && (
											<SettlementStructureIcon structure={settlement.settlement_structure} />
										)}
									</div>
								</div>
								{/* Edit/Archive buttons */}
								{isManageMode && (
									<div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
										<Tooltip content={`Edit ${isSettlement ? 'settlement' : 'recovery'}`}>
											<Button
												variant="icon"
												size="sm"
												color="neutral"
												onClick={() => isSettlement ? onEditSettlement(settlement) : onEditRecovery(recovery)}
											>
												<IconEdit size={16} />
											</Button>
										</Tooltip>
										<Tooltip content={`Archive ${isSettlement ? 'settlement' : 'recovery'}`}>
											<Button
												variant="icon"
												size="sm"
												color="neutral"
												onClick={() => isSettlement ? onArchiveSettlement(settlement) : onArchiveRecovery(recovery)}
											>
												<IconArchive size={16} style={{ color: 'var(--status-error)' }} />
											</Button>
										</Tooltip>
									</div>
								)}
							</div>

							{/* Expanded details */}
							<Collapse open={isActive}>
								<div style={{ marginTop: 8 }}>
									<Card variant="beveled" padding="md">
										{isSettlement ? (
											<SettlementDetails settlement={settlement} />
										) : (
											<RecoveryDetails recovery={recovery} relatedSettlement={relatedSettlement} />
										)}
									</Card>
								</div>
							</Collapse>
						</div>
					</div>
				);
			})}
		</div>
	);
}

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
			<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
			<span style={{ fontSize: 13 }}>{children}</span>
		</div>
	);
}

function SettlementDetails({ settlement }: { settlement: any }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Settlement Details</span>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
				<DetailField label="Party">
					<Highlight>{settlement.party_name}</Highlight>
				</DetailField>
				<DetailField label="Coverage">
					<Highlight>{formatCoverageType(settlement.loss_type)}</Highlight>
				</DetailField>
				<DetailField label="Demand Amount">
					<span style={{ fontWeight: 600, color: 'var(--status-warning)' }}>
						{formatCurrencyExact(parseFloat(settlement.demand_amount.toString()))}
					</span>
				</DetailField>
				<DetailField label="Demand Date">
					{dayjs(settlement.demand_date).format('MMM D, YYYY')}
				</DetailField>
				{settlement.settlement_amount && (
					<DetailField label="Settlement Amount">
						<span style={{ fontWeight: 600, color: 'var(--status-success)' }}>
							{formatCurrencyExact(parseFloat(settlement.settlement_amount.toString()))}
						</span>
					</DetailField>
				)}
				{settlement.agreed_liability_percentage && (
					<DetailField label="Agreed Liability">
						{settlement.agreed_liability_percentage}%
					</DetailField>
				)}
				{settlement.settlement_date && (
					<DetailField label="Settlement Date">
						{dayjs(settlement.settlement_date).format('MMM D, YYYY')}
					</DetailField>
				)}
				{settlement.settlement_structure && (
					<DetailField label="Structure">
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<SettlementStructureIcon structure={settlement.settlement_structure} />
							{settlement.settlement_structure === SettlementStructure.PAYMENT_PLAN ? 'Payment Plan' : 'Lump Sum'}
						</div>
					</DetailField>
				)}
				{settlement.settlement_structure === SettlementStructure.PAYMENT_PLAN && settlement.payment_amount && (
					<DetailField label="Payment Amount">
						{formatCurrencyExact(parseFloat(settlement.payment_amount.toString()))}
						{settlement.payment_frequency && ` / ${formatPaymentFrequency(settlement.payment_frequency)}`}
					</DetailField>
				)}
			</div>
			{settlement.notes && (
				<DetailField label="Notes">
					<span style={{ color: 'var(--text-secondary)' }}>{settlement.notes}</span>
				</DetailField>
			)}
		</div>
	);
}

function RecoveryDetails({ recovery, relatedSettlement }: { recovery: any; relatedSettlement: any }) {
	return (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
			<span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Recovery Details</span>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
				<DetailField label="Amount">
					<span style={{ fontWeight: 600, color: 'var(--status-success)' }}>
						{formatCurrencyExact(parseFloat(recovery.recovery_amount.toString()))}
					</span>
				</DetailField>
				<DetailField label="Date">
					{dayjs(recovery.recovery_date).format('MMM D, YYYY')}
				</DetailField>
				{recovery.recovery_source && (
					<DetailField label="Source">
						<Highlight>{recovery.recovery_source}</Highlight>
					</DetailField>
				)}
				{relatedSettlement && (
					<DetailField label="Settlement">
						{relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)} ·{' '}
						{formatCurrencyExact(parseFloat(relatedSettlement.demand_amount.toString()))}
					</DetailField>
				)}
				{relatedSettlement?.settlement_structure && (
					<DetailField label="Structure">
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<SettlementStructureIcon structure={relatedSettlement.settlement_structure} />
							{relatedSettlement.settlement_structure === SettlementStructure.PAYMENT_PLAN ? 'Payment Plan' : 'Lump Sum'}
						</div>
					</DetailField>
				)}
			</div>
			{recovery.notes && (
				<DetailField label="Notes">
					<span style={{ color: 'var(--text-secondary)' }}>{recovery.notes}</span>
				</DetailField>
			)}
		</div>
	);
}
