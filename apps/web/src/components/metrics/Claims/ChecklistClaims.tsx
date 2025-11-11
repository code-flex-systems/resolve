'use client';

import {
	DataGridPro,
	GridColDef,
	GridPaginationModel,
	GridPinnedColumnFields,
	GridRowSelectionModel,
} from '@mui/x-data-grid-pro';
import { formatAmount, formatMDY, formatUser } from '@/lib/utils/utils';
import { Box, Paper, Typography } from '@mui/material';
import IconHeaderCell from '../../common/IconHeaderCell';
import { CustomPagination } from '../../common/CustomPagination';
import { useMemo, useRef, useState } from 'react';
import { ChecklistClaimsOutput, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import dayjs, { Dayjs } from 'dayjs';
import ClaimStatusCell from './ClaimStatusCell';
import { Claim } from '@/hooks/trpc/useClaimTrpc';
import ClaimClientCell from './ClaimClientCell';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import { ClaimStatus } from '@/config/enums';

const PINNED_COLUMNS: GridPinnedColumnFields = {
	left: ['status'],
};

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Status',
		field: 'status',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimStatusCell {...params} />,
		align: 'right',
		width: 150,
	},
	{
		headerName: 'Claim / Checklist',
		field: 'claim_number',
		cellClassName: 'cell-bold',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <StackedHeaderCell primary={params.value} secondary={params.row.checklist_name} />,
		width: 220,
	},
	{
		headerName: 'Client',
		field: 'client',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Expected / Actual Recovery',
		field: 'expected_recovery',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => (
			<StackedHeaderCell
				primary={formatAmount(params.row.actual_recovery ?? 0, true)}
				secondary={formatAmount(params.value, true)}
			/>
		),
		width: 300,
	},
	{
		headerName: 'Current assignee',
		field: 'assignee',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => {
			const user = formatUser({
				id: params.value,
				first: params.row.assignee_first,
				last: params.row.assignee_last,
				email: params.row.assignee_email,
			});
			return <StackedHeaderCell primary={user} secondary={params.row.assignee_email} />;
		},
		width: 250,
	},
	// {
	// 	headerName: 'Initial assignee',
	// 	field: 'created_by',
	// 	renderHeader: (params) => <IconHeaderCell {...params} />,
	// 	renderCell: (params) => {
	// 		const user = formatUser({
	// 			id: params.value,
	// 			first: params.row.created_by_first,
	// 			last: params.row.created_by_last,
	// 			email: params.row.created_by_email,
	// 		});
	// 		return <StackedHeaderCell primary={user} secondary={params.row.created_by_email} />;
	// 	},
	// 	width: 220,
	// },
	{
		headerName: 'Last Update',
		field: 'updated_at',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		valueFormatter: (value: any, row) => formatMDY(value ?? row.created_at),
		align: 'right',
		width: 130,
	},
];

export default function ChecklistClaims({
	checklistId,
	user,
	range,
	setClaim,
}: {
	checklistId?: number;
	user: GetUserOutput | null;
	range: DateRange<Dayjs>;
	setClaim: (newClaim: ChecklistClaimsOutput[number] | null) => void;
}) {
	const [constraints, setContraints] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
	const [selectionModel, setSelectionModel] = useState<GridRowSelectionModel>([]);
	const selectedClaimStatus = useMetricsStore((state) => state.selectedClaimStatus);
	const trpcUtils = trpc.useUtils();
	const today = dayjs().format('MM/DD/YYYY');

	const filters = useMemo(
		() => ({
			checklistId,
			range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
			users: user ? [user.id] : [],
			claimStatus: selectedClaimStatus ?? undefined,
		}),
		[checklistId, range, user, selectedClaimStatus, today]
	);

	const { data = { rows: [], count: undefined }, isFetching } = useChecklistTrpc().listForClaims({
		filters,
		limit: constraints.pageSize,
		offset: constraints.page * constraints.pageSize,
	});
	const rowCountRef = useRef(typeof data.count === 'number' ? data.count : 0);

	const rowCount = useMemo(() => {
		if (typeof data.count === 'number') {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	const updateSelectionModel = (newModel: GridRowSelectionModel) => {
		setSelectionModel(newModel);
		const newClaim = newModel.length
			? (data.rows.find((c) => `${c.checklist_id}:${c.claim_id}` === newModel[0]) ?? null)
			: null;
		setClaim(newClaim);
	};

	// CSV column configuration matching table display
	const csvColumns: CsvColumn<ChecklistClaimsOutput[number]>[] = useMemo(
		() => [
			{
				header: 'Status',
				accessor: 'status',
				formatter: (value) => {
					// Convert ClaimStatus enum to readable text
					switch (value) {
						case ClaimStatus.SUBMITTED:
							return 'Submitted';
						case ClaimStatus.IN_PROGRESS:
							return 'In Progress';
						case ClaimStatus.BLOCKED:
							return 'Blocked';
						case ClaimStatus.UNWORKED:
							return 'Unworked';
						default:
							return value || '';
					}
				},
			},
			{
				header: 'Claim Number',
				accessor: 'claim_number',
			},
			{
				header: 'Checklist',
				accessor: 'checklist_name',
			},
			{
				header: 'Client',
				accessor: 'client',
			},
			{
				header: 'Actual Recovery',
				accessor: 'actual_recovery',
				formatter: (value) => formatAmount(value, true),
			},
			{
				header: 'Expected Recovery',
				accessor: 'expected_recovery',
				formatter: (value) => formatAmount(value, true),
			},
			{
				header: 'Current Assignee',
				accessor: (row) =>
					formatUser({
						id: row.assignee,
						first: row.assignee_first,
						last: row.assignee_last,
						email: row.assignee_email,
					}),
			},
			{
				header: 'Assignee Email',
				accessor: 'assignee_email',
			},
			{
				header: 'Last Update',
				accessor: (row) => row.updated_at ?? row.created_at,
				formatter: (value) => formatMDY(value),
			},
		],
		[]
	);

	return (
		<div style={styles.container} className="flex-col-start">
			<Paper sx={styles.paper} className="flex-col-start">
				<Box width="100%" display="flex" justifyContent="space-between" alignItems="center" mb={1}>
					<Typography variant="h6" fontSize={18} fontWeight={600}>
						Assigned Claims
					</Typography>
					<Box display="flex" justifyContent="flex-end" alignItems="center">
						<Typography variant="caption" fontSize={12} color="text.secondary" marginRight="20px">
							{rowCount.toLocaleString()} claim{rowCount !== 1 ? 's' : ''}
						</Typography>
						<ExportButton
							onExport={async () => {
								const result = await trpcUtils.checklist.exportChecklistClaims.fetch({ filters });
								return result;
							}}
							columns={csvColumns}
							filename="checklist_claims"
							size="small"
						/>
					</Box>
				</Box>
				<div style={styles.table}>
					<DataGridPro
						columns={COLUMNS}
						columnHeaderHeight={45}
						loading={isFetching}
						slots={{
							pagination: CustomPagination,
						}}
						slotProps={{
							loadingOverlay: {
								noRowsVariant: 'skeleton',
								variant: 'skeleton',
							},
						}}
						initialState={{
							pagination: { paginationModel: { pageSize: 20 } },
						}}
						rows={Array.isArray(data.rows) ? data.rows : []}
						rowCount={rowCount}
						rowHeight={60}
						getRowId={(row) => `${row.checklist_id}:${row.claim_id}`}
						hideFooterSelectedRowCount
						rowSelectionModel={selectionModel}
						onRowSelectionModelChange={updateSelectionModel}
						pageSizeOptions={[]}
						pagination
						paginationMode="server"
						paginationModel={constraints}
						onPaginationModelChange={setContraints}
						getRowClassName={(params) => 'cursor-pointer'}
						disableColumnSelector
						disableColumnMenu
						sx={styles.tableOverrides}
					/>
				</div>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		flex: 1,
		minWidth: 0,
		height: '100%',
		marginLeft: 20,
	},
	paper: {
		width: '100%',
		height: '100%',
		border: 1,
		borderColor: 'divider',
		padding: '15px 15px 0px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 40px)',
	},
	tableOverrides: {
		border: 'none',
	},
};
