'use client';

import { IconDesk, IconMapPin, IconSettings, IconSquarePlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useCallback, useMemo, useState } from 'react';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { formatMDY } from '@/lib/utils/utils';
import DeskLocationTypeDialog from './DeskLocationTypeDialog';
import DeskLocationDialog from './DeskLocationDialog';
import DeskTypeActionsCell from './DeskTypeActionsCell';
import DeskLocationActionsCell from './DeskLocationActionsCell';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const getTypeColumns = (isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		accessorKey: 'name',
		cell: ({ row: { original: row } }) => (
			<StackedHeaderCell
				primary={row.name}
				secondary={`${row.location_count ?? 0} location${row.location_count === 1 ? '' : 's'}`}
			/>
		),
		header: (params) => <IconHeaderCell {...params} icon={<IconDesk style={{ color: 'var(--text-muted)' }} />} />,
	},
	{
		header: 'Created',
		accessorKey: 'created_at',
		cell: ({ row: { original: row } }) => formatMDY(row.created_at),
		size: 150,
	},
	{
		header: 'Actions',
		accessorKey: 'actions',
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			return <DeskTypeActionsCell {...params} isManageMode={isManageMode} />;
		},
		size: 100,
		enableSorting: false,
	},
];

const getLocationColumns = (isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		accessorKey: 'name',
		cell: ({ row: { original: row } }) => (
			<StackedHeaderCell primary={row.name} secondary={row.is_active ? 'Active' : 'Inactive'} />
		),
		header: (params) => <IconHeaderCell {...params} icon={<IconMapPin style={{ color: 'var(--text-muted)' }} />} />,
	},
	{
		header: 'Users',
		accessorKey: 'user_count',
		cell: ({ row: { original: row } }) => `${row.user_count ?? 0} assigned`,
		size: 150,
	},
	{
		header: 'Created',
		accessorKey: 'created_at',
		cell: ({ row: { original: row } }) => formatMDY(row.created_at),
		size: 150,
	},
	{
		header: 'Actions',
		accessorKey: 'actions',
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			return <DeskLocationActionsCell {...params} isManageMode={isManageMode} />;
		},
		size: 100,
		enableSorting: false,
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

function LocationsOverlay({ selectedTypeId }: { selectedTypeId: string | null }) {
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
	// Fetch all desk location types (no)
	const { data: typesData = { rows: [], count: undefined }, isFetching: typesFetching } = useDeskTrpc().listTypes({});

	// Fetch desk locations for selected type (only when type is selected)
	const { data: locationsData = { rows: [], count: undefined }, isFetching: locationsFetching } =
		useDeskTrpc().listLocations(
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
					<Card variant="beveled" padding="md" style={styles.leftPanel}>
						<Toolbar
							left={
								<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
									Desk Location Types
								</span>
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
												style={{ color: isManageMode ? 'primary.main' : undefined }}
											/>
										</Button>
									</Tooltip>
								</>
							}
							height={50}
							padding={'0px 10px'}
						/>
						<p
							style={{
								color: 'var(--text-secondary)',
								fontSize: 13,
								margin: '0 0 12px',
								lineHeight: 1.5,
								padding: '0 10px',
							}}
						>
							Desk location types represent workflow phases (e.g., Evaluation, Review). They group related
							desk locations.
						</p>
						<div style={styles.table}>
							<DataTable
								columns={typeColumns}
								headerHeight={45}
								loading={typesFetching}
								rows={typesData.rows}
								rowHeight={60}
								hideFooter
								onRowClick={(row) => setDeskLocationTypeId(row.id)}
								getRowClassName={(row, index) => {
									if (row.id === selectedDeskLocationTypeId) return 'selected-row';
									return '';
								}}
								pinnedRight={isManageMode ? ['actions'] : []}
							/>
						</div>
					</Card>

					{/* Right Panel: Desk Locations */}
					<Card variant="beveled" padding="md" style={styles.rightPanel}>
						<Toolbar
							left={
								<span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
									Desk Locations
								</span>
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
						<p
							style={{
								color: 'var(--text-secondary)',
								fontSize: 13,
								margin: '0 0 12px',
								lineHeight: 1.5,
								padding: '0 10px',
							}}
						>
							Desk locations are specific work queues within a phase where claims are assigned and worked.
						</p>
						<div style={styles.table}>
							<DataTable
								columns={locationColumns}
								headerHeight={45}
								loading={locationsFetching}
								rows={locationsData.rows}
								rowHeight={60}
								hideFooter
								pinnedRight={isManageMode ? ['actions'] : []}
							/>
						</div>
					</Card>
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
		display: 'flex',
		gap: '15px',
		minHeight: 0,
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
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100vh - 190px)',
	},
};
