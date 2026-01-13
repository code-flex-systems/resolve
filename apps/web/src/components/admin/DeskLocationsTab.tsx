'use client';

import { useCallback, useMemo } from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { Button, Paper, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import Desk from '@mui/icons-material/Desk';
import LocationOn from '@mui/icons-material/LocationOn';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatMDY } from '@/lib/utils/utils';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import DeskLocationDialog from './DeskLocationDialog';
import DeskTypeActionsCell from './DeskTypeActionsCell';
import DeskLocationActionsCell from './DeskLocationActionsCell';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

const TYPE_COLUMNS: GridColDef[] = [
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
			<IconHeaderCell {...params} icon={<Desk style={{ color: BASE_COLOR_LIGHT }} />} />
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
		renderCell: DeskTypeActionsCell,
		width: 100,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
	},
];

const LOCATION_COLUMNS: GridColDef[] = [
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
			<IconHeaderCell {...params} icon={<LocationOn style={{ color: BASE_COLOR_LIGHT }} />} />
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
		renderCell: DeskLocationActionsCell,
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
			icon={<Desk sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

function LocationsOverlay({ selectedTypeId }: { selectedTypeId: number | null }) {
	if (selectedTypeId === null) {
		return (
			<CustomNoRowsOverlay
				text="Select a desk type to see locations"
				icon={<Desk sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
			/>
		);
	}
	return (
		<CustomNoRowsOverlay
			text="No desk locations found"
			icon={<LocationOn sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
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
					<Paper sx={styles.leftPanel} className="flex-col-start">
						<Toolbar
							left={
								<Typography variant="h6">Desk Location Types</Typography>
							}
							right={
								<Button
									variant="contained"
									startIcon={<AddBox />}
									onClick={toggleNewDeskLocationTypeDialog}
								>
									Type
								</Button>
							}
							height={50}
							padding={'0px 10px'}
						/>
						<div style={styles.table}>
							<DataGridPro
								columns={TYPE_COLUMNS}
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
								sx={styles.tableOverrides}
							/>
						</div>
					</Paper>

					{/* Right Panel: Desk Locations */}
					<Paper sx={styles.rightPanel} className="flex-col-start">
						<Toolbar
							left={
								<Typography variant="h6">Desk Locations</Typography>
							}
							right={
								<Button
									variant="contained"
									startIcon={<AddBox />}
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
								columns={LOCATION_COLUMNS}
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
								sx={styles.tableOverrides}
							/>
						</div>
					</Paper>
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
