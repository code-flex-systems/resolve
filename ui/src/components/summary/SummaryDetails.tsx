import { Paper } from '@mui/material';
import { useChecklistSummaryDetail } from '../../api/queries/checklist-queries';
import * as selectors from '../../state/checklist/selectors';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import useStore, { useChecklistSlice } from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import { ContactSupport, Description, InsertComment, Sms } from '@mui/icons-material';
import IconHeaderCell from '../common/IconHeaderCell';
import { useMemo, useRef } from 'react';
import { SummarySegment } from '../../config/enums';
import * as actions from '../../state/checklist/actions';
import { CustomPagination } from '../common/CustomPagination';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Page',
		field: 'page_title',
		cellClassName: 'cell-bold',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Description sx={{ color: 'secondary.main' }} />} />
		),
		width: 200,
	},
	{
		headerName: 'Question',
		field: 'question_text',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<ContactSupport sx={{ color: 'secondary.main' }} />} />
		),
		width: 200,
	},
	{
		headerName: 'Answer',
		field: 'answer_texts',
		cellClassName: 'italics',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<InsertComment sx={{ color: 'secondary.main' }} />} />
		),
		width: 200,
	},
	{
		headerName: 'Additional Info',
		field: 'response_text',
		cellClassName: 'italics',
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Sms sx={{ color: 'secondary.main', transform: 'scaleX(-1)' }} />} />
		),
		flex: 1,
	},
];

export default function SummaryDetails() {
	const selectedSummarySegment = useChecklistSlice((state) => state.selectedSummarySegment);
	const checklistSummaryContraints = useChecklistSlice((state) => state.checklistSummaryContraints);
	const segmentData = useStore(useShallow(selectors.selectedSegmentData));
	const rowCountRef = useRef(segmentData?.totalCount || 0);
	const { isFetching: isLoadingDetails } = useChecklistSummaryDetail(!segmentData);

	const columns = useMemo(() => {
		return selectedSummarySegment === SummarySegment.UNANSWERED
			? COLUMNS.filter((c) => !['answer_texts', 'response_text'].includes(c.field))
			: COLUMNS;
	}, [selectedSummarySegment]);

	const rowCount = useMemo(() => {
		if (segmentData?.totalCount !== undefined) {
			rowCountRef.current = segmentData.totalCount;
		}
		return rowCountRef.current;
	}, [segmentData?.totalCount]);

	return (
		<Paper style={styles.table}>
			<DataGrid
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
				rows={segmentData?.rows ?? []}
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
				onPaginationModelChange={actions.updateChecklistSummaryConstraints}
				disableColumnSelector
				disableRowSelectionOnClick
				disableColumnMenu
				sx={styles.tableOverrides}
			/>
		</Paper>
	);
}

const styles = {
	table: {
		flex: 1,
		height: '100%',
		overflow: 'auto',
		marginLeft: 10,
	},
	tableOverrides: {
		border: 'none',
	},
};
