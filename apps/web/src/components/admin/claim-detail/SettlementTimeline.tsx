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

// Helper to format payment frequency for display
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

// Settlement structure icon component
function SettlementStructureIcon({ structure, size = 'small' }: { structure: string | null | undefined; size?: 'small' | 'inherit' }) {
	if (!structure) return null;
	const isPaymentPlan = structure === SettlementStructure.PAYMENT_PLAN;
	return (
		<Tooltip content={isPaymentPlan ? 'Payment Plan' : 'Lump Sum'}>
			{isPaymentPlan ? (
				<IconCalendarRepeat fontSize={size} style={{ color: 'info.main' }} />
			) : (
				<IconCash fontSize={size} style={{ color: 'var(--text-secondary)' }} />
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

	// Pre-compute settlement lookup to avoid O(N) find per recovery item
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
										borderLeft: `1px dashed ${'var(--border)'}`,
									}}
								/>
							)}
						</div>

						{/* Right column: content */}
						<div style={{ flex: 1, paddingLeft: 16,
								paddingBottom: isLastItem ? 0 : 16,
								opacity: isGrayedOut ? 0.4 : 1,
								transition: 'opacity 0.3s ease', }}>
							{/* Summary row - clickable */}
							<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
								<div
									onClick={() => handleItemClick(item.settlementId)}
									style={{
										cursor: 'pointer',
										borderRadius: 4,
										padding: 8,
										marginLeft: -8,
										flex: 1,
									}}
								>
									<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
										<div>
											<span style={{ fontSize: 14, fontWeight: 600 }}>
												{dayjs(item.date).format('MMM D')}
											</span>
											{isSettlement ? (
												<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
													{settlement.party_name}
													{settlement.loss_type && <> · {formatCoverageType(settlement.loss_type)}</>}
												</span>
											) : (
												<span style={{ fontSize: 12,  color: 'var(--text-secondary)'  }}>
													{recovery.recovery_source || 'No source'}
													{relatedSettlement && (
														<>
															{' '}· {relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)}
														</>
													)}
												</span>
											)}
											<span style={{ fontSize: 13, fontWeight: 600 }}
											>
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
										<Tooltip content="`Edit ${isSettlement ? 'settlement' : 'recovery'}`">
							<Button variant="icon" size="sm" color="neutral">
							<IconEdit size={16} />
						</Button>
						</Tooltip>
										<Tooltip content="`Archive ${isSettlement ? 'settlement' : 'recovery'}`">
							<Button variant="icon" size="sm" color="neutral">
							<IconArchive style={{ color: 'var(--status-error)' }} />
						</Button>
						</Tooltip>
									</div>
								)}
							</div>

							{/* Expanded details */}
							<Collapse open={isActive}>
								<div style={{ marginTop: 8 }}>
									<Card variant="beveled" padding="md" style={{ backgroundColor: '#fafafa' }}>
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

function SettlementDetails({ settlement }: { settlement: any }) {
	return (
		<>
			<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
				Settlement Details
			</span>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Party</span>
					<span style={{ fontSize: 13 }}><Highlight>{settlement.party_name}</Highlight></span>
				</div>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Coverage</span>
					<span style={{ fontSize: 13 }}><Highlight>{formatCoverageType(settlement.loss_type)}</Highlight></span>
				</div>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demand Amount</span>
					<span style={{  fontSize: 13, fontWeight: 600 ,  color: 'var(--status-warning)'  }}>
						{formatCurrencyExact(parseFloat(settlement.demand_amount.toString()))}
					</span>
				</div>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Demand Date</span>
					<span style={{ fontSize: 13 }}>{dayjs(settlement.demand_date).format('MMM D, YYYY')}</span>
				</div>
				{settlement.settlement_amount && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Settlement Amount</span>
						<span style={{  fontSize: 13, fontWeight: 600 ,  color: 'var(--status-success)'  }}>
							{formatCurrencyExact(parseFloat(settlement.settlement_amount.toString()))}
						</span>
					</div>
				)}
				{settlement.agreed_liability_percentage && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Agreed Liability</span>
						<span style={{ fontSize: 13 }}>{settlement.agreed_liability_percentage}%</span>
					</div>
				)}
				{settlement.settlement_date && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Settlement Date</span>
						<span style={{ fontSize: 13 }}>{dayjs(settlement.settlement_date).format('MMM D, YYYY')}</span>
					</div>
				)}
				{settlement.settlement_structure && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Structure</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<SettlementStructureIcon structure={settlement.settlement_structure} size="inherit" />
							<span style={{ fontSize: 13 }}>
								{settlement.settlement_structure === SettlementStructure.PAYMENT_PLAN ? 'Payment Plan' : 'Lump Sum'}
							</span>
						</div>
					</div>
				)}
				{settlement.settlement_structure === SettlementStructure.PAYMENT_PLAN && settlement.payment_amount && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Payment Amount</span>
						<span style={{ fontSize: 13 }}>
							{formatCurrencyExact(parseFloat(settlement.payment_amount.toString()))}
							{settlement.payment_frequency && ` / ${formatPaymentFrequency(settlement.payment_frequency)}`}
						</span>
					</div>
				)}
			</div>
			{settlement.notes && (
				<div style={{ marginTop: 16 }}>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Notes</span>
					<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>{settlement.notes}</span>
				</div>
			)}
		</>
	);
}

function RecoveryDetails({ recovery, relatedSettlement }: { recovery: any; relatedSettlement: any }) {
	return (
		<>
			<span style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
				Recovery Details
			</span>
			<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Amount</span>
					<span style={{  fontSize: 13, fontWeight: 600 ,  color: 'var(--status-success)'  }}>
						{formatCurrencyExact(parseFloat(recovery.recovery_amount.toString()))}
					</span>
				</div>
				<div>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Date</span>
					<span style={{ fontSize: 13 }}>{dayjs(recovery.recovery_date).format('MMM D, YYYY')}</span>
				</div>
				{recovery.recovery_source && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Source</span>
						<span style={{ fontSize: 13 }}><Highlight>{recovery.recovery_source}</Highlight></span>
					</div>
				)}
				{relatedSettlement && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Settlement</span>
						<span style={{ fontSize: 13 }}>
							{relatedSettlement.party_name} · {formatCoverageType(relatedSettlement.loss_type)} ·{' '}
							{formatCurrencyExact(parseFloat(relatedSettlement.demand_amount.toString()))}
						</span>
					</div>
				)}
				{relatedSettlement?.settlement_structure && (
					<div>
						<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Structure</span>
						<div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
							<SettlementStructureIcon structure={relatedSettlement.settlement_structure} size="inherit" />
							<span style={{ fontSize: 13 }}>
								{relatedSettlement.settlement_structure === SettlementStructure.PAYMENT_PLAN ? 'Payment Plan' : 'Lump Sum'}
							</span>
						</div>
					</div>
				)}
			</div>
			{recovery.notes && (
				<div style={{ marginTop: 16 }}>
					<span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Notes</span>
					<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>{recovery.notes}</span>
				</div>
			)}
		</>
	);
}
