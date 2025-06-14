import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { formatMDYAbv } from '@/lib/utils/utils';
import { Button, Paper } from '@mui/material';
import { AccountCircle, AddBox, ContentPasteSearch, Description } from '@mui/icons-material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import ChecklistActionsCell from './ChecklistActionsCell';
import { toggleNewChecklistDialog } from '@/state/admin/actions';
import { useAdminSlice } from '@/state/store';
import NewChecklistDialog from './NewChecklistDialog';

const COLUMNS: GridColDef[] = [
	{
		field: 'name',
		headerName: 'Checklist',
		renderHeader: (params) => <IconHeaderCell icon={<ContentPasteSearch />} {...params} />,
		cellClassName: 'cell-primary cell-bold',
		width: 200,
	},
	{
		field: 'page_count',
		headerName: '# of Pages',
		renderHeader: (params) => <IconHeaderCell icon={<Description />} {...params} />,
		valueFormatter: (value: any) => value?.toLocaleString(),
		width: 120,
	},
	{
		field: 'created_by',
		headerName: 'Creator',
		renderHeader: (params) => <IconHeaderCell icon={<AccountCircle />} {...params} />,
		width: 200,
	},
	{
		field: 'created_at',
		headerName: 'Date Created',
		valueFormatter: formatMDYAbv,
		width: 120,
		align: 'right',
	},
	{
		field: 'updated_at',
		headerName: 'Last Updated',
		valueFormatter: formatMDYAbv,
		width: 120,
		align: 'right',
	},
	{
		field: 'actions',
		headerName: '',
		flex: 1,
		minWidth: 200,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
		renderCell: (params) => <ChecklistActionsCell {...params} />,
	},
];

export default function ChecklistsTab() {
	const { data: checklists = [], isFetching } = useChecklistTrpc().list({});
	const showNewChecklistDialog = useAdminSlice((state) => state.showNewChecklistDialog);
	return (
		<div style={styles.container}>
			<Paper sx={styles.paper} className="flex-col-start">
				<Toolbar
					right={
						<>
							<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewChecklistDialog}>
								Checklist
							</Button>
						</>
					}
					height={50}
					padding={'0px 10px'}
				/>
				<div style={styles.table}>
					<DataGrid
						columns={COLUMNS}
						columnHeaderHeight={45}
						loading={isFetching}
						slotProps={{
							loadingOverlay: {
								noRowsVariant: 'linear-progress',
								variant: 'linear-progress',
							},
						}}
						rows={checklists}
						rowHeight={60}
						hideFooterSelectedRowCount
						pageSizeOptions={[]}
						getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
						disableColumnSelector
						disableRowSelectionOnClick
						disableColumnMenu
						sx={styles.tableOverrides}
						hideFooter
					/>
				</div>
			</Paper>
			{showNewChecklistDialog && <NewChecklistDialog />}
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 135px)',
		paddingTop: 20,
	},
	paper: {
		width: '100%',
		height: '100%',
		padding: '15px 15px 0px',
		border: 1,
		borderColor: 'divider',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
		fontSize: 15,
	},
};
