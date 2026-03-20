'use client';

import { IconChecklist, IconFileSearch, IconSettings, IconSquarePlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { formatMDY } from '@/lib/utils/utils';
import { DataGridPro, GridColDef, GridPinnedColumnFields } from '@mui/x-data-grid-pro';
import { useMemo, useState } from 'react';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import ChecklistActionsCell from './ChecklistActionsCell';
import { useAdminStore } from '@/stores/useAdminStore';
import NewChecklistDialog from './NewChecklistDialog';
import ExpandableHeaderCell from '../common/ExpandableHeaderCell';
import StackedHeaderCell from '../common/StackedHeaderCell';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { dataGridFocusStyles } from '@/styles/theme';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { Dialog } from '@mui/material';

const getColumns = (isManageMode: boolean): GridColDef[] => [
	{
		field: 'name',
		headerName: '',
		// renderHeader: (params) => (
		// 	<ExpandableHeaderCell {...params} icon={<IconFileSearch size={17} style={{ color: white }} />} />
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
		renderCell: (params) => <ChecklistActionsCell {...params} isManageMode={isManageMode} />,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No checklists found"
			icon={<IconChecklist size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function ChecklistsTab() {
	const { data: checklists = [], isFetching } = useChecklistTrpc().list({});
	const showNewChecklistDialog = useAdminStore((state) => state.showNewChecklistDialog);
	const toggleNewChecklistDialog = useAdminStore((state) => state.toggleNewChecklistDialog);
	const [isManageMode, setIsManageMode] = useState(false);

	const columns = useMemo(() => getColumns(isManageMode), [isManageMode]);
	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading checklists...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={<span>Checklists</span>}
						right={
							<>
								<Button variant="contained" startIcon={<IconSquarePlus size={20} />} onClick={toggleNewChecklistDialog}>
									Checklist
								</Button>
								<Tooltip content="Manage">
									<Button variant="icon" size="sm"
										onClick={() => setIsManageMode(!isManageMode)}
										style={{ marginLeft: 8, backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
									>
										<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
									</Button>
								</Tooltip>
							</>
						}
						height={50}
						padding={'0px 10px'}
					/>
					<div style={styles.table}>
						<DataGridPro
							columns={columns}
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
							pinnedColumns={pinnedColumns}
							style={styles.tableOverrides}
							hideFooter
							showColumnVerticalBorder={false}
						/>
					</div>
				</div>
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
		...dataGridFocusStyles,
	},
};
