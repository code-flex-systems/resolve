'use client';

import { IconCategory, IconSettings, IconSquarePlus, IconTag } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useMemo, useCallback, useState } from 'react';
import { useReferenceDataTrpc } from '@/hooks/trpc/useReferenceDataTrpc';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams } from '@mui/x-data-grid-pro';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { dataGridFocusStyles } from '@/styles/theme';
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
			<IconHeaderCell {...params} icon={<IconCategory style={{ color: 'var(--text-muted)' }} />} />
		),
		flex: 1,
	},
];

const getOptionColumns = (isManageMode: boolean): GridColDef[] => [
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
			<IconHeaderCell {...params} icon={<IconTag style={{ color: 'var(--text-muted)' }} />} />
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
				return <Chip  size="sm" color="error" variant="outlined">Deactivated</Chip>;
			}
			return (
				<Chip 
					size="sm"
					color={row.is_active ? 'success' : 'neutral'}
					variant="outlined">{row.is_active ? 'Active' : 'Inactive'}</Chip>
			);
		},
		width: 110,
	},
	{
		headerName: 'System',
		field: 'is_system_default',
		renderCell: ({ row }: GridRenderCellParams) =>
			row.is_system_default ? (
				<Chip  size="sm" color="info" variant="outlined">System</Chip>
			) : null,
		width: 90,
	},
	{
		headerName: 'Actions',
		field: 'actions',
		renderCell: (params) => <ReferenceOptionActionsCell {...params} isManageMode={isManageMode} />,
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
			icon={<IconCategory size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

function OptionsOverlay({ selectedEntity }: { selectedEntity: ReferenceEntity | null }) {
	if (selectedEntity === null) {
		return (
			<CustomNoRowsOverlay
				text="Select a reference type to see options"
				icon={<IconCategory size={35} style={{ color: 'var(--text-muted)' }} />}
			/>
		);
	}
	return (
		<CustomNoRowsOverlay
			text="No options found"
			icon={<IconTag size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function ReferenceDataTab() {
	const showNewReferenceOptionDialog = useAdminStore((state) => state.showNewReferenceOptionDialog);
	const selectedReferenceEntity = useAdminStore((state) => state.selectedReferenceEntity);
	const toggleNewReferenceOptionDialog = useAdminStore((state) => state.toggleNewReferenceOptionDialog);
	const setReferenceEntity = useAdminStore((state) => state.setReferenceEntity);

	const [isManageMode, setIsManageMode] = useState(false);

	const optionColumns = useMemo(() => getOptionColumns(isManageMode), [isManageMode]);
	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

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
		<div>
			<div style={styles.container}>
				<div style={styles.panelContainer}>
					{/* Left Panel: Reference Entity Types */}
					<div style={styles.leftPanel} className="flex-col-start">
						<Toolbar
							left={<span>Reference Data Types</span>}
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
								style={styles.tableOverrides}
							/>
						</div>
					</div>

					{/* Right Panel: Reference Options */}
					<div style={styles.rightPanel} className="flex-col-start">
						<Toolbar
							left={
								<span>
									{selectedReferenceEntity
										? REFERENCE_ENTITY_DISPLAY[selectedReferenceEntity].label
										: 'Options'}
								</span>
							}
							right={
								<>
									<Button
										variant="contained"
										startIcon={<IconSquarePlus size={20} />}
										onClick={toggleNewReferenceOptionDialog}
										disabled={selectedReferenceEntity === null}
									>
										Option
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
								columns={optionColumns}
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
								pinnedColumns={pinnedColumns}
								style={styles.tableOverrides}
							/>
						</div>
					</div>
				</div>

				{showNewReferenceOptionDialog && <ReferenceOptionDialog />}
			</div>
		</div>
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
