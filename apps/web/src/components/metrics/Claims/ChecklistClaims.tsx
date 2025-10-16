'use client';

import {
	DataGridPro,
	GridColDef,
	GridPaginationModel,
	GridPinnedColumnFields,
	GridRowSelectionModel,
} from '@mui/x-data-grid-pro';
import { formatMDY, formatUser } from '@/lib/utils/utils';
import { Paper } from '@mui/material';
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
		headerName: 'Client / Expected Recovery',
		field: 'client',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => <ClaimClientCell {...params} />,
		flex: 1,
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
	const today = dayjs().format('MM/DD/YYYY');
	const { data = { rows: [], count: undefined }, isFetching } = useChecklistTrpc().listForClaims({
		filters: {
			checklistId,
			range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
			users: user ? [user.id] : [],
			claimStatus: selectedClaimStatus ?? undefined,
		},
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
		console.log(newClaim);
		setClaim(newClaim);
	};

	return (
		<div style={styles.container} className="flex-col-start">
			<Paper sx={styles.paper} className="flex-col-start">
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
		height: '100%',
	},
	tableOverrides: {
		border: 'none',
	},
};
