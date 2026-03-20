'use client';

import { IconDesk, IconMapPin, IconSettings, IconSquarePlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useCallback, useMemo, useState } from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { DataGridPro, GridColDef, GridPinnedColumnFields } from '@mui/x-data-grid-pro';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { dataGridFocusStyles } from '@/styles/theme';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatMDY } from '@/lib/utils/utils';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import DeskLocationDialog from './DeskLocationDialog';
import DeskTypeActionsCell from './DeskTypeActionsCell';
import DeskLocationActionsCell from './DeskLocationActionsCell';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

const getTypeColumns = (isManageMode: boolean): GridColDef[] => [
	{
		headerName: 'Desk Location Type',
		field: 'name',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={row.name}
				secondary={`${row.location_count ?? 0} location${row.location_count === 1 ? '' : 's'}`}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<IconDesk style={{ color: 'var(--text-muted)' }} />} />
		),
		flex: 1,
	},
	{
		headerName: 'Created',
		field: 'created_at',
		renderCell: ({ row }) => formatMDY(row.created_at),
		width: 150,
	},
	{
		headerName: 'Actions',
		field: 'actions',
		renderCell: (params) => <DeskTypeActionsCell {...params} isManageMode={isManageMode} />,
		width: 100,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
	},
];

const getLocationColumns = (isManageMode: boolean): GridColDef[] => [
	{
		headerName: 'Desk Location',
		field: 'name',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={row.name}
				secondary={row.is_active ? 'Active' : 'Inactive'}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<IconMapPin style={{ color: 'var(--text-muted)' }} />} />
		),
		flex: 1,
		cellClassName: (params) => (!params.row.is_active ? 'inactive-cell' : ''),
	},
	{
		headerName: 'Users',
		field: 'user_count',
		renderCell: ({ row }) => `${row.user_count ?? 0} assigned`,
		width: 150,
		cellClassName: (params) => (!params.row.is_active ? 'inactive-cell' : ''),
	},
	{
		headerName: 'Created',
		field: 'created_at',
		renderCell: ({ row }) => formatMDY(row.created_at),
		width: 150,
		cellClassName: (params) => (!params.row.is_active ? 'inactive-cell' : ''),
	},
	{
		headerName: 'Actions',
		field: 'actions',
		renderCell: (params) => <DeskLocationActionsCell {...params} isManageMode={isManageMode} />,
		width: 100,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
	},
];

function NoTypesRows() {
	return (
		<CustomNoRowsOverlay
			text="No desk location types found"
			icon={<IconDesk size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

function LocationsOverlay({ selectedTypeId }: { selectedTypeId: number | null }) {
	if (selectedTypeId === null) {
		return (
			<CustomNoRowsOverlay
				text="Select a desk type to see locations"
				icon={<IconDesk size={35} style={{ color: 'var(--text-muted)' }} />}
			/>
		);
	}
	return (
		<CustomNoRowsOverlay
			text="No desk locations found"
			icon={<IconMapPin size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function DeskLocationsTab() {
	const showNewDeskLocationTypeDialog = useAdminStore((state) => state.showNewDeskLocationTypeDialog);
	const showNewDeskLocationDialog = useAdminStore((state) => state.showNewDeskLocationDialog);
	const selectedDeskLocationTypeId = useAdminStore((state) => state.selectedDeskLocationTypeId);
	const toggleNewDeskLocationTypeDialog = useAdminStore((state) => state.toggleNewDeskLocationTypeDialog);
	const toggleNewDeskLocationDialog = useAdminStore((state) => state.toggleNewDeskLocationDialog);
	const setDeskLocationTypeId = useAdminStore((state) => state.setDeskLocationTypeId);

	const [isManageMode, setIsManageMode] = useState(false);

	const typeColumns = useMemo(() => getTypeColumns(isManageMode), [isManageMode]);
	const locationColumns = useMemo(() => getLocationColumns(isManageMode), [isManageMode]);
	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	// Fetch all desk location types (no pagination)
	const { data: typesData = { rows: [], count: undefined }, isFetching: typesFetching } = useDeskTrpc().listTypes({});

	// Fetch desk locations for selected type (only when type is selected)
	const { data: locationsData = { rows: [], count: undefined }, isFetching: locationsFetching } = useDeskTrpc().listLocations(
		{
			deskLocationTypeId: selectedDeskLocationTypeId ?? undefined,
			showInactive: true, // Show both active and inactive locations
		},
		{
			enabled: selectedDeskLocationTypeId !== null,
		}
	);

	// Memoized overlay for right panel
	const locationsOverlay = useCallback(
		() => <LocationsOverlay selectedTypeId={selectedDeskLocationTypeId} />,
		[selectedDeskLocationTypeId]
	);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading desk locations...">
			<div style={styles.container}>
				<div style={styles.panelContainer}>
					{/* Left Panel: Desk Location Types */}
					<div style={styles.leftPanel} className="flex-col-start">
						<Toolbar
							left={
								<span>Desk Location Types</span>
							}
							right={
								<>
									<Button
										variant="contained"
										startIcon={<IconSquarePlus size={20} />}
										onClick={toggleNewDeskLocationTypeDialog}
									>
										Type
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
								columns={typeColumns}
								columnHeaderHeight={45}
								loading={typesFetching}
								slots={{
									noRowsOverlay: NoTypesRows,
									noResultsOverlay: NoTypesRows,
								}}
								slotProps={{
									loadingOverlay: {
										noRowsVariant: 'linear-progress',
										variant: 'linear-progress',
									},
								}}
								rows={typesData.rows}
								rowHeight={60}
								hideFooter
								onRowClick={(params) => setDeskLocationTypeId(params.row.id)}
								getRowClassName={(params) => {
									if (params.row.id === selectedDeskLocationTypeId) return 'selected-row';
									return '';
								}}
								disableColumnSelector
								disableRowSelectionOnClick
								disableColumnMenu
								pinnedColumns={pinnedColumns}
								style={styles.tableOverrides}
							/>
						</div>
					</div>

					{/* Right Panel: Desk Locations */}
					<div style={styles.rightPanel} className="flex-col-start">
						<Toolbar
							left={
								<span>Desk Locations</span>
							}
							right={
								<Button
									variant="contained"
									startIcon={<IconSquarePlus size={20} />}
									onClick={toggleNewDeskLocationDialog}
									disabled={selectedDeskLocationTypeId === null}
								>
									Location
								</Button>
							}
							height={50}
							padding={'0px 10px'}
						/>
						<div style={styles.table}>
							<DataGridPro
								columns={locationColumns}
								columnHeaderHeight={45}
								loading={locationsFetching}
								slots={{
									noRowsOverlay: locationsOverlay,
									noResultsOverlay: locationsOverlay,
								}}
								slotProps={{
									loadingOverlay: {
										noRowsVariant: 'linear-progress',
										variant: 'linear-progress',
									},
								}}
								rows={locationsData.rows}
								rowHeight={60}
								hideFooter
								disableColumnSelector
								disableRowSelectionOnClick
								disableColumnMenu
								pinnedColumns={pinnedColumns}
								style={styles.tableOverrides}
							/>
						</div>
					</div>
				</div>

				{showNewDeskLocationTypeDialog && <DeskLocationTypeDialog />}
				{showNewDeskLocationDialog && <DeskLocationDialog />}
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
	panelContainer: {
		width: '100%',
		flex: 1,
		display: 'flex',
		gap: '15px',
		minHeight: 0,
	},
	leftPanel: {
		width: '40%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '24px 24px 0px',
		minHeight: 0,
	},
	rightPanel: {
		width: '60%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '24px 24px 0px',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
};
