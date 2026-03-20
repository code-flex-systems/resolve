'use client';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import { DataGridPro, GridColDef, GridPaginationModel } from '@mui/x-data-grid-pro';
import IconHeaderCell from '../common/IconHeaderCell';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef, useState } from 'react';
import CustomPagination from '../common/CustomPagination';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import useSelectedBreakdownAnswerData from '@/hooks/useSelectedBreakdownAnswerData';
import { IconQuote } from '@tabler/icons-react';

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="Select an answer to see responses"
			icon={<IconQuote size={35} style={{ color: BASE_COLOR_LIGHT }} />}
		/>
	);
}
function NoResults() {
	return (
		<CustomNoRowsOverlay
			text="No responses found"
			icon={<IconQuote size={35} style={{ color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Claim',
		field: 'claim_number',
		cellClassName: 'cell-bold',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Client',
		field: 'client',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Responder',
		field: 'responder',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Response Date',
		field: 'created_at',
		valueFormatter: (value: any) => dayjs(value).format('hh:mm A MMM D, YYYY'),
		renderHeader: (params) => <IconHeaderCell {...params} />,
		align: 'right',
		width: 200,
	},
	{
		headerName: 'Additional Info',
		field: 'additional_info',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		flex: 1,
	},
];

export default function Breakdown() {
	const [constraints, setContraints] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId) ?? -1;
	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const answerData = useSelectedBreakdownAnswerData();
	const today = dayjs().format('MM/DD/YYYY');
	const { data: breakdown = [], isFetching: loadingBreakdown } = useResponseTrpc().listForAnswer(
		{
			answerId: selectedAnswerId,
			filters: {
				claimId: breakdownClaim?.id,
				range: [breakdownRange[0]?.toString() ?? today, breakdownRange[1]?.toString() ?? today] as [
					string,
					string,
				],
				users: breakdownUsers.map((u) => u.id),
			},
			limit: constraints.pageSize,
			offset: constraints.page * constraints.pageSize,
		},
		{ enabled: selectedAnswerId !== -1 }
	);

	const rowCountRef = useRef(answerData?.answer_count ?? 0);
	const rowCount = useMemo(() => {
		if (answerData?.answer_count !== undefined) {
			rowCountRef.current = answerData.answer_count;
		}
		return rowCountRef.current;
	}, [answerData?.answer_count]);

	useEffect(() => {
		setContraints({ page: 0, pageSize: 25 });
	}, [selectedAnswerId]);

	return (
		<div     style={{ flex: 1, height: '100%', flexShrink: 1, minWidth: 0 }}>
			<div  className="flex-col-start" style={styles.paper}>
				<div style={styles.table}>
					<DataGridPro
						columns={COLUMNS}
						columnHeaderHeight={45}
						loading={loadingBreakdown}
						slotProps={{
							loadingOverlay: {
								noRowsVariant: 'linear-progress',
								variant: 'linear-progress',
							},
						}}
						slots={{
							pagination: CustomPagination,
							noRowsOverlay: NoRows,
							noResultsOverlay: NoResults,
						}}
						rows={breakdown}
						rowCount={rowCount}
						rowHeight={40}
						hideFooterSelectedRowCount
						getRowClassName={(params) =>
							params.indexRelativeToCurrentPage % 2 === 0 ? 'striped hovered-row' : 'hovered-row'
						}
						pageSizeOptions={[]}
						pagination
						paginationMode="server"
						paginationModel={constraints}
						onPaginationModelChange={setContraints}
						disableColumnSelector
						disableRowSelectionOnClick
						disableColumnMenu
						sx={styles.tableOverrides}
					/>
				</div>
			</div>
		</div>
	);
}

const styles = {
	paper: {
		width: '100%',
		height: '100%',
		padding: '15px 15px 0px',
	},
	table: {
		width: '100%',
		height: '100%',
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
};
