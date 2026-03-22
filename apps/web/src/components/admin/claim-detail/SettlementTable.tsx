'use client';

import { IconArchive, IconCalendarRepeat, IconCash, IconEdit } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import { useMemo } from 'react';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { numericSortComparator, stringSortComparator } from '@/lib/utils/utils';
import { SettlementStructure } from '@/config/enums';
import dayjs from 'dayjs';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
interface TableRow {
	id: string;
	hierarchy: string[];
	type: 'settlement' | 'recovery';
	party_name?: string;
	loss_type?: string;
	demand_amount?: number;
	demand_date?: Date;
	settlement_structure?: string;
	recovery_amount?: number;
	recovery_date?: Date;
	recovery_source?: string;
	total_recovered?: number;
	remaining_balance?: number;
	originalData: any;
	settlementId: string;
}

interface SettlementTableProps {
	settlements: any[];
	recoveryEvents: any[];
	isManageMode: boolean;
	onEditSettlement: (settlement: any) => void;
	onEditRecovery: (recovery: any) => void;
	onArchiveSettlement: (settlement: any) => void;
	onArchiveRecovery: (recovery: any) => void;
}

export default function SettlementTable({
	settlements,
	recoveryEvents,
	isManageMode,
	onEditSettlement,
	onEditRecovery,
	onArchiveSettlement,
	onArchiveRecovery,
}: SettlementTableProps) {
	const tableRows = useMemo<TableRow[]>(() => {
		const rows: TableRow[] = [];

		const recoveriesBySettlement = new Map<number, typeof recoveryEvents>();
		recoveryEvents.forEach((r) => {
			const existing = recoveriesBySettlement.get(r.settlement_id) || [];
			existing.push(r);
			recoveriesBySettlement.set(r.settlement_id, existing);
		});

		settlements.forEach((s) => {
			const settlementRecoveries = recoveriesBySettlement.get(s.id) || [];
			const totalRecovered = settlementRecoveries.reduce(
				(sum, r) => sum + (r.recovery_amount ? parseFloat(r.recovery_amount.toString()) : 0),
				0
			);
			const demandAmount = s.demand_amount ? parseFloat(s.demand_amount.toString()) : 0;
			const settlementAmt = s.settlement_amount ? parseFloat(s.settlement_amount.toString()) : null;
			const baseAmount = settlementAmt ?? demandAmount;
			const remainingBalance = baseAmount - totalRecovered;

			rows.push({
				id: `settlement-${s.id}`,
				hierarchy: [`${s.id}`],
				type: 'settlement',
				party_name: s.party_name,
				loss_type: s.loss_type,
				demand_amount: demandAmount,
				demand_date: s.demand_date,
				settlement_structure: s.settlement_structure,
				total_recovered: totalRecovered,
				remaining_balance: remainingBalance,
				originalData: s,
				settlementId: s.id,
			});

			settlementRecoveries.forEach((r) => {
				rows.push({
					id: `recovery-${r.id}`,
					hierarchy: [`${s.id}`, `recovery-${r.id}`],
					type: 'recovery',
					settlement_structure: s.settlement_structure, // Inherit from parent settlement
					recovery_amount: r.recovery_amount ? parseFloat(r.recovery_amount.toString()) : 0,
					recovery_date: r.recovery_date,
					recovery_source: r.recovery_source ?? undefined,
					originalData: r,
					settlementId: s.id,
				});
			});
		});

		return rows;
	}, [settlements, recoveryEvents]);

	const columns = useMemo<ColumnDef<TableRow, any>[]>(
		() => [
			{
				accessorKey: 'party_name',
				header: 'Party / Source',
				minSize: 150,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (params.row.type === 'settlement') {
						return <span style={{ fontSize: 13 }}>{params.row.party_name}</span>;
					}
					return (
						<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>
							{params.row.recovery_source || 'No source'}
						</span>
					);
				},
			},
			{
				accessorKey: 'loss_type',
				header: 'Coverage',
				size: 120,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (params.row.type === 'settlement' && params.row.loss_type) {
						return <span style={{ fontSize: 13 }}>{formatCoverageType(params.row.loss_type)}</span>;
					}
					return null;
				},
			},
			{
				accessorKey: 'settlement_structure',
				header: 'Type',
				size: 60,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					const structure = params.row.settlement_structure;
					if (!structure) return null;
					const isPaymentPlan = structure === SettlementStructure.PAYMENT_PLAN;
					return (
						<Tooltip
							content={isPaymentPlan ? 'Payment Plan' : 'Lump Sum'}
						>
							{isPaymentPlan ? (
								<IconCalendarRepeat size={20} style={{ color: 'var(--status-info)' }} />
							) : (
								<IconCash size={20} style={{ color: 'var(--text-secondary)' }} />
							)}
						</Tooltip>
					);
				},
			},
			{
				accessorKey: 'demand_amount',
				header: 'Demand',
				size: 110,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (params.row.type === 'settlement' && params.row.demand_amount !== undefined) {
						return <span style={{ fontSize: 13 }}>{formatCurrencyExact(params.row.demand_amount)}</span>;
					}
					return null;
				},
			},
			{
				accessorKey: 'total_recovered',
				header: 'Recovered',
				size: 110,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (params.row.type === 'settlement') {
						return (
							<span style={{ fontSize: 13 }}>
								{formatCurrencyExact(params.row.total_recovered || 0)}
							</span>
						);
					}
					if (params.row.type === 'recovery' && params.row.recovery_amount !== undefined) {
						return <span style={{ fontSize: 13 }}>{formatCurrencyExact(params.row.recovery_amount)}</span>;
					}
					return null;
				},
			},
			{
				accessorKey: 'remaining_balance',
				header: 'Balance',
				size: 110,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (params.row.type === 'settlement' && params.row.remaining_balance !== undefined) {
						const balance = params.row.remaining_balance;
						return (
							<span style={{ fontSize: 13, color: balance > 0 ? 'var(--status-error)' : 'var(--status-success)' }}>
								{balance < 0
									? `-${formatCurrencyExact(Math.abs(balance))}`
									: formatCurrencyExact(balance)}
							</span>
						);
					}
					return null;
				},
			},
			{
				accessorKey: 'date',
				header: 'Date',
				size: 100,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					const date = params.row.type === 'settlement' ? params.row.demand_date : params.row.recovery_date;
					if (date) {
						return <span style={{ fontSize: 13 }}>{dayjs(date).format('MMM D, YYYY')}</span>;
					}
					return null;
				},
			},
			{
				accessorKey: 'actions',
				header: '',
				size: 80,
				enableSorting: false,
				cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() };
					if (!isManageMode) return null;
					return (
						<div style={{ display: 'flex', gap: 4 }}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () =>
										params.row.type === 'settlement'
											? onEditSettlement(params.row.originalData)
											: onEditRecovery(params.row.originalData),
									sx: { padding: '3px', },
								}}
								tooltipProps={{ title: `Edit ${params.row.type}` }}
								icon={<IconEdit size={20} />}
								compact
							/>
							<BasicButtonStyled
								buttonProps={{
									onClick: () =>
										params.row.type === 'settlement'
											? onArchiveSettlement(params.row.originalData)
											: onArchiveRecovery(params.row.originalData),
									sx: { padding: '3px', },
								}}
								tooltipProps={{ title: `Archive ${params.row.type}` }}
								icon={<IconArchive style={{ color: 'var(--status-error)' }} />}
								compact
							/>
						</div>
					);
				},
			},
		],
		[isManageMode, onEditSettlement, onEditRecovery, onArchiveSettlement, onArchiveRecovery]
	);

	return (
		<DataTable
			rows={tableRows}
			columns={columns}
			headerHeight={40}
			rowHeight={44}
			hideFooter
			pinnedRight={isManageMode ? ['actions'] : []}
		/>
	);
}
