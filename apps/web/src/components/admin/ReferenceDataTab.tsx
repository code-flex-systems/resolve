'use client';

import { IconCategory, IconSettings, IconSquarePlus, IconTag } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useMemo, useCallback, useState } from 'react';
import { useReferenceDataTrpc } from '@/hooks/trpc/useReferenceDataTrpc';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import ReferenceOptionDialog from './ReferenceOptionDialog';
import ReferenceOptionActionsCell from './ReferenceOptionActionsCell';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import {
	KNOWN_REFERENCE_ENTITIES,
	REFERENCE_ENTITY_DISPLAY,
	type ReferenceEntity,
} from '@/schemas/referenceDataSchemas';

const ENTITY_COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'display_name',
		cell: ({ row: { original: row } }) => (
			<StackedHeaderCell primary={row.display_name} secondary={row.description || row.entity} />
		),
		header: (params) => (
			<IconHeaderCell {...params} icon={<IconCategory style={{ color: 'var(--text-muted)' }} />} />
		),
	},
];

const getOptionColumns = (isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		accessorKey: 'display_label',
		cell: ({ row: { original: row } }) => (
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
		header: (params) => <IconHeaderCell {...params} icon={<IconTag style={{ color: 'var(--text-muted)' }} />} />,
	},
	{
		header: 'Status',
		accessorKey: 'is_active',
		cell: ({ row: { original: row } }: any) => {
			if (row.deleted_at) {
				return (
					<Chip size="sm" color="error" variant="outlined">
						Deactivated
					</Chip>
				);
			}
			return (
				<Chip size="sm" color={row.is_active ? 'success' : 'neutral'} variant="outlined">
					{row.is_active ? 'Active' : 'Inactive'}
				</Chip>
			);
		},
		size: 110,
	},
	{
		header: 'System',
		accessorKey: 'is_system_default',
		cell: ({ row: { original: row } }: any) =>
			row.is_system_default ? (
				<Chip size="sm" color="info" variant="outlined">
					System
				</Chip>
			) : null,
		size: 90,
	},
	{
		header: 'Actions',
		accessorKey: 'actions',
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			return <ReferenceOptionActionsCell {...params} isManageMode={isManageMode} />;
		},
		size: 100,
		enableSorting: false,
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
					<Card variant="beveled" padding="md" style={styles.leftPanel}>
						<Toolbar left={<span>Reference Data Types</span>} height={50} padding={'0px 10px'} />
						<div style={styles.table}>
							<DataTable
								columns={ENTITY_COLUMNS}
								headerHeight={45}
								loading={listsFetching}
								rows={entityRows}
								rowHeight={60}
								hideFooter
								onRowClick={(row) => setReferenceEntity(row.entity)}
								getRowClassName={(row, index) => {
									if (row.entity === selectedReferenceEntity) return 'selected-row';
									return '';
								}}
							/>
						</div>
					</Card>

					{/* Right Panel: Reference Options */}
					<Card variant="beveled" padding="md" style={styles.rightPanel}>
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
										<Button
											variant="icon"
											size="sm"
											onClick={() => setIsManageMode(!isManageMode)}
											style={{
												marginLeft: 8,
												backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined,
											}}
										>
											<IconSettings
												size={20}
												style={{ color: isManageMode ? 'var(--text-accent)' : undefined }}
											/>
										</Button>
									</Tooltip>
								</>
							}
							height={50}
							padding={'0px 10px'}
						/>
						<div style={styles.table}>
							<DataTable
								columns={optionColumns}
								headerHeight={45}
								loading={optionsFetching}
								rows={optionsData}
								rowHeight={60}
								hideFooter
								pinnedRight={isManageMode ? ['actions'] : []}
							/>
						</div>
					</Card>
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
		display: 'flex',
		gap: '15px',
		minHeight: 0,
		flex: 1,
	},
	leftPanel: {
		width: '40%',
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	rightPanel: {
		width: '60%',
		display: 'flex',
		flex: 1,
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	table: {
		size: '100%',
		height: 'calc(100vh - 190px)',
	},
};
