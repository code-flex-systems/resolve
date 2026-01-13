'use client';

import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { formatMDY } from '@/lib/utils/utils';
import { Button, Paper, Typography } from '@mui/material';
import AddBox from '@mui/icons-material/AddBox';
import Checklist from '@mui/icons-material/Checklist';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import ChecklistActionsCell from './ChecklistActionsCell';
import { useAdminStore } from '@/stores/useAdminStore';
import NewChecklistDialog from './NewChecklistDialog';
import ExpandableHeaderCell from '../common/ExpandableHeaderCell';
import StackedHeaderCell from '../common/StackedHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

const COLUMNS: GridColDef[] = [
	{
		field: 'name',
		headerName: '',
		// renderHeader: (params) => (
		// 	<ExpandableHeaderCell {...params} icon={<ContentPasteSearch sx={{ fontSize: 17, color: 'white' }} />} />
		// ),
		renderCell: (params) => <StackedHeaderCell primary={params.row.name} secondary={params.row.creator} />,
		cellClassName: 'cell-primary cell-bold',
		width: 200,
		sortable: false,
	},
	{
		field: 'page_count',
		headerName: '',
		valueFormatter: (value: any) => `${value?.toLocaleString() ?? ''} pages`,
		width: 120,
		sortable: false,
	},
	{
		field: 'dates',
		headerName: '',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		renderCell: (params) => (
			<StackedHeaderCell
				primary={params.row.updated_at ? `Last updated ${formatMDY(params.row.updated_at)}` : ''}
				secondary={`Created ${formatMDY(params.row.created_at)}`}
			/>
		),
		width: 250,
		align: 'left',
		sortable: false,
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

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No checklists found"
			icon={<Checklist sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function ChecklistsTab() {
	const { data: checklists = [], isFetching } = useChecklistTrpc().list({});
	const showNewChecklistDialog = useAdminStore((state) => state.showNewChecklistDialog);
	const toggleNewChecklistDialog = useAdminStore((state) => state.toggleNewChecklistDialog);
	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading checklists...">
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={<Typography variant="h6">Checklists</Typography>}
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
						<DataGridPro
							columns={COLUMNS}
							columnHeaderHeight={45}
							loading={isFetching}
							slots={{
								noRowsOverlay: NoRows,
								noResultsOverlay: NoRows,
							}}
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
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={styles.tableOverrides}
							hideFooter
							showColumnVerticalBorder={false}
						/>
					</div>
				</Paper>
				{showNewChecklistDialog && <NewChecklistDialog />}
			</div>
		</PageTransitionWrapper>
	);
}

const styles = {
	container: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
	},
	paper: {
		width: '100%',
		flex: 1,
		padding: '24px 24px 0px',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
		fontSize: 15,
		'& .MuiDataGrid-columnSeparator': {
			display: 'none',
		},
		'& .MuiDataGrid-columnHeader:hover .MuiDataGrid-iconSeparator': {
			opacity: 0,
		},
		...dataGridFocusStyles,
	},
};
