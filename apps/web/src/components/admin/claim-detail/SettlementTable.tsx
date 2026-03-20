'use client';

import { IconArchive, IconCalendarRepeat, IconCash, IconEdit } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import { dataGridFocusStyles } from '@/styles/theme';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useMemo } from 'react';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
import { formatCoverageType } from '@/lib/utils/claimUtils';
import { numericSortComparator, stringSortComparator } from '@/lib/utils/utils';
import { SettlementStructure } from '@/config/enums';
import dayjs from 'dayjs';
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
	settlementId: number;
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
	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

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

	const columns = useMemo<GridColDef<TableRow>[]>(
		() => [
			{
				field: 'party_name',
				headerName: 'Party / Source',
				flex: 1,
				minWidth: 150,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement') {
						return <span style={{ fontSize: 13 }}>{params.row.party_name}</span>;
					}
					return (
						<span style={{ fontSize: 13,  color: 'var(--text-secondary)'  }}>
							{params.row.recovery_source || 'No source'}
						</span>
					);
				},
				sortComparator: (v1, v2, param1, param2) => {
					const row1 = param1.api.getRow(param1.id) as TableRow | undefined;
					const row2 = param2.api.getRow(param2.id) as TableRow | undefined;
					const a = row1?.type === 'settlement' ? (row1?.party_name || '') : (row1?.recovery_source || '');
					const b = row2?.type === 'settlement' ? (row2?.party_name || '') : (row2?.recovery_source || '');
					return a.toLowerCase().localeCompare(b.toLowerCase());
				},
			},
			{
				field: 'loss_type',
				headerName: 'Coverage',
				width: 120,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement' && params.row.loss_type) {
						return <span style={{ fontSize: 13 }}>{formatCoverageType(params.row.loss_type)}</span>;
					}
					return null;
				},
				sortComparator: stringSortComparator,
			},
			{
				field: 'settlement_structure',
				headerName: 'Type',
				width: 60,
				align: 'center',
				headerAlign: 'center',
				renderCell: (params: GridRenderCellParams<TableRow>) => {
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
				sortComparator: stringSortComparator,
			},
			{
				field: 'demand_amount',
				headerName: 'Demand',
				width: 110,
				align: 'right',
				headerAlign: 'right',
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement' && params.row.demand_amount !== undefined) {
						return <span style={{ fontSize: 13 }}>{formatCurrencyExact(params.row.demand_amount)}</span>;
					}
					return null;
				},
				sortComparator: numericSortComparator,
			},
			{
				field: 'total_recovered',
				headerName: 'Recovered',
				width: 110,
				align: 'right',
				headerAlign: 'right',
				renderCell: (params: GridRenderCellParams<TableRow>) => {
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
				sortComparator: (v1, v2, param1, param2) => {
					const row1 = param1.api.getRow(param1.id) as TableRow | undefined;
					const row2 = param2.api.getRow(param2.id) as TableRow | undefined;
					const a = row1?.type === 'settlement' ? (row1?.total_recovered || 0) : (row1?.recovery_amount || 0);
					const b = row2?.type === 'settlement' ? (row2?.total_recovered || 0) : (row2?.recovery_amount || 0);
					return a - b;
				},
			},
			{
				field: 'remaining_balance',
				headerName: 'Balance',
				width: 110,
				align: 'right',
				headerAlign: 'right',
				renderCell: (params: GridRenderCellParams<TableRow>) => {
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
				sortComparator: numericSortComparator,
			},
			{
				field: 'date',
				headerName: 'Date',
				width: 100,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					const date = params.row.type === 'settlement' ? params.row.demand_date : params.row.recovery_date;
					if (date) {
						return <span style={{ fontSize: 13 }}>{dayjs(date).format('MMM D, YYYY')}</span>;
					}
					return null;
				},
				sortComparator: (v1, v2, param1, param2) => {
					const row1 = param1.api.getRow(param1.id) as TableRow | undefined;
					const row2 = param2.api.getRow(param2.id) as TableRow | undefined;
					const date1 = row1?.type === 'settlement' ? row1?.demand_date : row1?.recovery_date;
					const date2 = row2?.type === 'settlement' ? row2?.demand_date : row2?.recovery_date;
					if (!date1 && !date2) return 0;
					if (!date1) return 1;
					if (!date2) return -1;
					return new Date(date1).getTime() - new Date(date2).getTime();
				},
			},
			{
				field: 'actions',
				headerName: '',
				width: 80,
				sortable: false,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
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
		<DataGridPro
			rows={tableRows}
			columns={columns}
			treeData
			getTreeDataPath={(row) => row.hierarchy}
			groupingColDef={{
				headerName: '',
				width: 50,
				valueFormatter: () => '',
				hideDescendantCount: true,
			}}
			defaultGroupingExpansionDepth={0}
			columnHeaderHeight={40}
			rowHeight={44}
			hideFooter
			disableColumnSelector
			disableRowSelectionOnClick
			disableColumnMenu
			pinnedColumns={pinnedColumns}
			style={{
				border: 'none',
				...dataGridFocusStyles,
			}}
		/>
	);
}
