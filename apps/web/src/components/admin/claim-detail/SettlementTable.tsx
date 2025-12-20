'use client';

import { Box, Chip, Typography } from '@mui/material';
import Edit from '@mui/icons-material/Edit';
import Archive from '@mui/icons-material/Archive';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useMemo } from 'react';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import { formatCurrencyExact } from '@/lib/utils/recoveryUtils';
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

interface TableRow {
	id: string;
	hierarchy: string[];
	type: 'settlement' | 'recovery';
	party_name?: string;
	loss_type?: string;
	demand_amount?: number;
	demand_date?: Date;
	status?: string;
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
				status: s.status,
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
						return <Typography fontSize={13}>{params.row.party_name}</Typography>;
					}
					return (
						<Typography fontSize={13} color="text.secondary">
							{params.row.recovery_source || 'No source'}
						</Typography>
					);
				},
			},
			{
				field: 'loss_type',
				headerName: 'Coverage',
				width: 120,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement' && params.row.loss_type) {
						return <Typography fontSize={13}>{capitalize(params.row.loss_type)}</Typography>;
					}
					return null;
				},
			},
			{
				field: 'demand_amount',
				headerName: 'Demand',
				width: 110,
				align: 'right',
				headerAlign: 'right',
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement' && params.row.demand_amount !== undefined) {
						return <Typography fontSize={13}>{formatCurrencyExact(params.row.demand_amount)}</Typography>;
					}
					return null;
				},
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
							<Typography fontSize={13}>
								{formatCurrencyExact(params.row.total_recovered || 0)}
							</Typography>
						);
					}
					if (params.row.type === 'recovery' && params.row.recovery_amount !== undefined) {
						return <Typography fontSize={13}>{formatCurrencyExact(params.row.recovery_amount)}</Typography>;
					}
					return null;
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
							<Typography fontSize={13} color={balance > 0 ? 'error.light' : 'success.main'}>
								{balance < 0
									? `-${formatCurrencyExact(Math.abs(balance))}`
									: formatCurrencyExact(balance)}
							</Typography>
						);
					}
					return null;
				},
			},
			{
				field: 'status',
				headerName: 'Status',
				width: 100,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					if (params.row.type === 'settlement' && params.row.status) {
						return (
							<Chip label={capitalize(params.row.status)} size="small" color={getStatusColor(params.row.status)} />
						);
					}
					return null;
				},
			},
			{
				field: 'date',
				headerName: 'Date',
				width: 100,
				renderCell: (params: GridRenderCellParams<TableRow>) => {
					const date = params.row.type === 'settlement' ? params.row.demand_date : params.row.recovery_date;
					if (date) {
						return <Typography fontSize={13}>{dayjs(date).format('MMM D, YYYY')}</Typography>;
					}
					return null;
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
						<Box display="flex" gap={0.5}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () =>
										params.row.type === 'settlement'
											? onEditSettlement(params.row.originalData)
											: onEditRecovery(params.row.originalData),
									sx: { padding: '3px', '& .MuiSvgIcon-root': { fontSize: 16 } },
								}}
								tooltipProps={{ title: `Edit ${params.row.type}` }}
								icon={<Edit />}
								compact
							/>
							<BasicButtonStyled
								buttonProps={{
									onClick: () =>
										params.row.type === 'settlement'
											? onArchiveSettlement(params.row.originalData)
											: onArchiveRecovery(params.row.originalData),
									sx: { padding: '3px', '& .MuiSvgIcon-root': { fontSize: 16 } },
								}}
								tooltipProps={{ title: `Archive ${params.row.type}` }}
								icon={<Archive sx={{ color: 'error.main' }} />}
								compact
							/>
						</Box>
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
			sx={{
				border: 'none',
				'& .MuiDataGrid-cell': {
					display: 'flex',
					alignItems: 'center',
				},
				'& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within, & .MuiDataGrid-cell:focus-visible': {
					outline: 'none',
				},
				'& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within': {
					outline: 'none',
				},
			}}
		/>
	);
}
