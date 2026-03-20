'use client';
import { dataGridFocusStyles } from '@/styles/theme';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useMemo, useRef } from 'react';
import { SummarySegment } from '@/config/enums';

import CustomPagination from '../common/CustomPagination';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import IconHeaderCell from '../common/IconHeaderCell';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Page',
		field: 'page_title',
		cellClassName: 'cell-bold',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Question',
		field: 'question_text',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Answer',
		field: 'answer_texts',
		cellClassName: 'italics',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Additional Info',
		field: 'response_text',
		cellClassName: 'italics',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		flex: 1,
	},
];

export default function SummaryDetails() {
	const { checklistId = -1, claimId = -1 } = useChecklistParams();
	const selectedSummarySegment = useChecklistStore((state) => state.selectedSummarySegment);
	const checklistSummaryContraints = useChecklistStore((state) => state.checklistSummaryContraints);
	const updateChecklistSummaryConstraints = useChecklistStore((state) => state.updateChecklistSummaryConstraints);
	const { data: summaryDetails = { rows: [], count: undefined }, isFetching: isLoadingDetails } =
		useChecklistTrpc().getSummaryDetail(
			{
				checklistId,
				claimId,
				segment: selectedSummarySegment,
				limit: checklistSummaryContraints.pageSize,
				offset: checklistSummaryContraints.page * checklistSummaryContraints.pageSize,
			},
			{ enabled: checklistId !== -1 && claimId !== -1 }
		);
	const rowCountRef = useRef(summaryDetails.count ?? 0);

	const columns = useMemo(() => {
		return selectedSummarySegment === SummarySegment.UNANSWERED
			? COLUMNS.filter((c) => !['answer_texts', 'response_text'].includes(c.field))
			: COLUMNS;
	}, [selectedSummarySegment]);

	const rowCount = useMemo(() => {
		if (summaryDetails.count !== undefined) {
			rowCountRef.current = summaryDetails.count;
		}
		return rowCountRef.current;
	}, [summaryDetails.count]);

	return (
		<div style={styles.table}>
			<DataGridPro
				columns={columns}
				columnHeaderHeight={45}
				loading={isLoadingDetails}
				slots={{
					pagination: CustomPagination,
				}}
				slotProps={{
					loadingOverlay: {
						noRowsVariant: 'linear-progress',
						variant: 'linear-progress',
					},
				}}
				rows={summaryDetails.rows}
				rowCount={rowCount}
				rowHeight={40}
				getRowId={(row) => row.question_id}
				hideFooterSelectedRowCount
				pageSizeOptions={[]}
				getRowClassName={(params) =>
					params.indexRelativeToCurrentPage % 2 === 0 ? 'striped hovered-row' : 'hovered-row'
				}
				pagination
				paginationMode="server"
				paginationModel={checklistSummaryContraints}
				onPaginationModelChange={updateChecklistSummaryConstraints}
				disableColumnSelector
				disableRowSelectionOnClick
				disableColumnMenu
				sx={styles.tableOverrides}
			/>
		</div>
	);
}

const styles = {
	table: {
		flex: 1,
		height: '100%',
		overflow: 'auto',
		marginLeft: '20px',
		borderRadius: 6,
		padding: '24px 30px 12px',
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
};
