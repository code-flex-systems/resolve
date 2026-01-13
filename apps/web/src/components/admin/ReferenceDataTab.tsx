'use client';

import { useMemo, useCallback } from 'react';
import { useReferenceDataTrpc } from '@/hooks/trpc/useReferenceDataTrpc';
import { Button, Chip, Fade, Paper, Typography } from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import AddBox from '@mui/icons-material/AddBox';
import Category from '@mui/icons-material/Category';
import Label from '@mui/icons-material/Label';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import ReferenceOptionDialog from './ReferenceOptionDialog';
import ReferenceOptionActionsCell from './ReferenceOptionActionsCell';
import {
	KNOWN_REFERENCE_ENTITIES,
	REFERENCE_ENTITY_DISPLAY,
	type ReferenceEntity,
} from '@/schemas/referenceDataSchemas';

const ENTITY_COLUMNS: GridColDef[] = [
	{
		headerName: 'Reference Data Type',
		field: 'display_name',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={row.display_name}
				secondary={row.description || row.entity}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Category style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		flex: 1,
	},
];

const OPTION_COLUMNS: GridColDef[] = [
	{
		headerName: 'Option',
		field: 'display_label',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={
					<span>
						{row.icon_emoji && <span style={{ marginRight: 5 }}>{row.icon_emoji}</span>}
						{row.display_label}
					</span>
				}
				secondary={row.value}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<Label style={{ color: BASE_COLOR_LIGHT }} />} />
		),
		flex: 1,
		cellClassName: (params) => {
			if (params.row.deleted_at) return 'deleted-cell';
			if (!params.row.is_active) return 'inactive-cell';
			return '';
		},
	},
	{
		headerName: 'Status',
		field: 'is_active',
		renderCell: ({ row }: GridRenderCellParams) => {
			if (row.deleted_at) {
				return <Chip label="Deactivated" size="small" color="error" variant="outlined" />;
			}
			return (
				<Chip
					label={row.is_active ? 'Active' : 'Inactive'}
					size="small"
					color={row.is_active ? 'success' : 'default'}
					variant="outlined"
				/>
			);
		},
		width: 110,
	},
	{
		headerName: 'System',
		field: 'is_system_default',
		renderCell: ({ row }: GridRenderCellParams) =>
			row.is_system_default ? (
				<Chip label="System" size="small" color="info" variant="outlined" />
			) : null,
		width: 90,
	},
	{
		headerName: 'Actions',
		field: 'actions',
		renderCell: ReferenceOptionActionsCell,
		width: 100,
		sortable: false,
		filterable: false,
		disableColumnMenu: true,
	},
];

function NoEntitiesRows() {
	return (
		<CustomNoRowsOverlay
			text="No reference data types found"
			icon={<Category sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

function OptionsOverlay({ selectedEntity }: { selectedEntity: ReferenceEntity | null }) {
	if (selectedEntity === null) {
		return (
			<CustomNoRowsOverlay
				text="Select a reference type to see options"
				icon={<Category sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
			/>
		);
	}
	return (
		<CustomNoRowsOverlay
			text="No options found"
			icon={<Label sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function ReferenceDataTab() {
	const showNewReferenceOptionDialog = useAdminStore((state) => state.showNewReferenceOptionDialog);
	const selectedReferenceEntity = useAdminStore((state) => state.selectedReferenceEntity);
	const toggleNewReferenceOptionDialog = useAdminStore((state) => state.toggleNewReferenceOptionDialog);
	const setReferenceEntity = useAdminStore((state) => state.setReferenceEntity);

	const { lists, options } = useReferenceDataTrpc();

	// Fetch all reference lists
	const { data: listsData = [], isFetching: listsFetching } = lists({});

	// Fetch options for selected entity (with inactive and deleted options for admin view)
	const { data: optionsData = [], isFetching: optionsFetching } = options(
		{
			entity: selectedReferenceEntity!,
			showInactive: true,
			showDeleted: true,
		},
		{
			enabled: selectedReferenceEntity !== null,
		}
	);

	// Build entity rows from known entities with display info (memoized)
	const entityRows = useMemo(
		() =>
			KNOWN_REFERENCE_ENTITIES.map((entity) => {
				const displayInfo = REFERENCE_ENTITY_DISPLAY[entity];
				return {
					id: entity,
					entity,
					display_name: displayInfo.label,
					description: displayInfo.description,
				};
			}),
		[] // KNOWN_REFERENCE_ENTITIES and REFERENCE_ENTITY_DISPLAY are constants
	);

	// Memoized overlay for right panel
	const optionsOverlay = useCallback(
		() => <OptionsOverlay selectedEntity={selectedReferenceEntity} />,
		[selectedReferenceEntity]
	);

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<div style={styles.panelContainer}>
					{/* Left Panel: Reference Entity Types */}
					<Paper sx={styles.leftPanel} className="flex-col-start">
						<Toolbar
							left={<Typography variant="h6">Reference Data Types</Typography>}
							height={50}
							padding={'0px 10px'}
						/>
						<div style={styles.table}>
							<DataGridPro
								columns={ENTITY_COLUMNS}
								columnHeaderHeight={45}
								loading={listsFetching}
								slots={{
									noRowsOverlay: NoEntitiesRows,
									noResultsOverlay: NoEntitiesRows,
								}}
								slotProps={{
									loadingOverlay: {
										noRowsVariant: 'linear-progress',
										variant: 'linear-progress',
									},
								}}
								rows={entityRows}
								rowHeight={60}
								hideFooter
								onRowClick={(params) => setReferenceEntity(params.row.entity)}
								getRowClassName={(params) => {
									if (params.row.entity === selectedReferenceEntity) return 'selected-row';
									return '';
								}}
								disableColumnSelector
								disableRowSelectionOnClick
								disableColumnMenu
								sx={styles.tableOverrides}
							/>
						</div>
					</Paper>

					{/* Right Panel: Reference Options */}
					<Paper sx={styles.rightPanel} className="flex-col-start">
						<Toolbar
							left={
								<Typography variant="h6">
									{selectedReferenceEntity
										? REFERENCE_ENTITY_DISPLAY[selectedReferenceEntity].label
										: 'Options'}
								</Typography>
							}
							right={
								<Button
									variant="contained"
									startIcon={<AddBox />}
									onClick={toggleNewReferenceOptionDialog}
									disabled={selectedReferenceEntity === null}
								>
									Option
								</Button>
							}
							height={50}
							padding={'0px 10px'}
						/>
						<div style={styles.table}>
							<DataGridPro
								columns={OPTION_COLUMNS}
								columnHeaderHeight={45}
								loading={optionsFetching}
								slots={{
									noRowsOverlay: optionsOverlay,
									noResultsOverlay: optionsOverlay,
								}}
								slotProps={{
									loadingOverlay: {
										noRowsVariant: 'linear-progress',
										variant: 'linear-progress',
									},
								}}
								rows={optionsData}
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

				{showNewReferenceOptionDialog && <ReferenceOptionDialog />}
			</div>
		</Fade>
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
		padding: '15px 15px 0px',
		minHeight: 0,
	},
	rightPanel: {
		width: '60%',
		display: 'flex',
		flexDirection: 'column' as const,
		padding: '15px 15px 0px',
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
