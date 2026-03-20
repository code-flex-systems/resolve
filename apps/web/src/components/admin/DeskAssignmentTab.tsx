'use client';

import { IconClipboard, IconEdit, IconSettings, IconUserCircle } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import IconHeaderCell from '../common/IconHeaderCell';
import SearchInput from '../common/SearchInput';
import { useEffect, useMemo, useRef, useState } from 'react';
import { dataGridFocusStyles } from '@/styles/theme';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BulkDeskAssignmentDialog from './BulkDeskAssignmentDialog';
import EditUserDeskAssignmentsDialog from './EditUserDeskAssignmentsDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';
import CustomPagination from '../common/CustomPagination';
import DeskLocationTypeFilter from '../common/DeskLocationTypeFilter';
import DeskLocationFilter from '../common/DeskLocationFilter';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import { Dialog } from '@mui/material';

function NoUsersRows() {
	return (
		<CustomNoRowsOverlay
			text="No users found"
			icon={<IconUserCircle size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

export default function DeskAssignmentTab() {
	const userConstraints = useAdminStore((state) => state.userConstraints);
	const updateUserConstraints = useAdminStore((state) => state.updateUserConstraints);
	const [selectedUserIds, setSelectedUserIds] = useState<GridRowSelectionModel>([]);
	const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
	const [editingUserId, setEditingUserId] = useState<string | null>(null);

	// URL filters hook
	const { getParam, setParam, setParams } = useUrlFilters();

	// Filter states from URL params
	const userSearchTerm = getParam('search') ?? '';
	const deskLocationTypeIdStr = getParam('desk_type');
	const deskLocationTypeId = deskLocationTypeIdStr ? Number(deskLocationTypeIdStr) : null;
	const deskLocationIdStr = getParam('desk_location');
	const deskLocationId = deskLocationIdStr ? Number(deskLocationIdStr) : null;

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');
	const [isManageMode, setIsManageMode] = useState(false);

	// Fetch users with desk assignments
	const { data: usersData = { rows: [], count: undefined }, isFetching: usersFetching } =
		useUserTrpc().withDeskAssignments({
			limit: userConstraints.pageSize,
			offset: userConstraints.page * userConstraints.pageSize,
			searchTerm: userSearchTerm,
			deskLocationTypeId: deskLocationTypeId ?? undefined,
			deskLocationId: deskLocationId ?? undefined,
		});

	const rowCountRef = useRef(usersData.count ?? 0);
	const rowCount = useMemo(() => {
		if (usersData.count !== undefined) {
			rowCountRef.current = usersData.count;
		}
		return rowCountRef.current;
	}, [usersData.count]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(userSearchTerm);
	}, [userSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	// Memoized columns - setEditingUserId is stable (useState setter)
	const columns: GridColDef[] = useMemo(
		() => [
			{
				headerName: 'User',
				field: 'user',
				renderCell: ({ row }) => (
					<StackedHeaderCell primary={`${row.first} ${row.last}`} secondary={row.email.toLowerCase()} />
				),
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<IconUserCircle style={{ color: 'var(--text-muted)' }} />} />
				),
				flex: 1,
			},
			{
				headerName: 'Desk Assignments',
				field: 'desk_assignments',
				renderCell: ({ row }) => {
					const count = row.assignment_count || 0;
					return count === 1 ? '1 desk' : `${count} desks`;
				},
				width: 150,
			},
			{
				headerName: 'Actions',
				field: 'actions',
				renderCell: ({ row }) => {
					if (!isManageMode) return null;
					return (
						<div style={styles.actionsContainer}>
							<BasicButtonStyled
								buttonProps={{
									onClick: () => setEditingUserId(row.id),
								}}
								tooltipProps={{ title: 'Edit desk assignments' }}
								icon={<IconEdit size={15} />}
							/>
						</div>
					);
				},
				width: 100,
				sortable: false,
				filterable: false,
				disableColumnMenu: true,
			},
		],
		[isManageMode]
	);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading desk assignments...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
						<div style={{ display: 'flex', alignItems: 'center' }}>
							<span style={{ marginRight: '20px' }}>
								Desk Assignments
							</span>
						</div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
							<Button
								variant="contained"
								startIcon={<IconClipboard size={20} />}
								onClick={() => setShowBulkAssignDialog(true)}
								disabled={selectedUserIds.length === 0}
								style={{ marginLeft: '10px' }}
							>
								Assign to Desk ({selectedUserIds.length})
							</Button>
							<Tooltip content="Manage">
								<Button variant="icon" size="sm"
									onClick={() => setIsManageMode(!isManageMode)}
									style={{ marginLeft: 8, backgroundColor: isManageMode ? 'var(--bg-tertiary)' : undefined }}
								>
									<IconSettings size={20} style={{ color: isManageMode ? 'primary.main' : undefined }} />
								</Button>
							</Tooltip>
						</div>
					</div>
					<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '5px' }}>
						<div></div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
							<DeskLocationTypeFilter
								value={deskLocationTypeId}
								onChange={(id: number | null) => {
									setParams({
										desk_type: id?.toString() ?? null,
										desk_location: null, // Clear desk location when type changes
									});
								}}
								label="Desk Type"
							/>
							<DeskLocationFilter
								value={deskLocationId}
								onChange={(id: number | null) => setParam('desk_location', id?.toString() ?? null)}
								deskLocationTypeId={deskLocationTypeId ?? undefined}
								label="Desk Location"
							/>
							<SearchInput
								value={searchTerm}
								onChange={(value) => {
									setSearchTerm(value);
									if (value === '') {
										setParam('search', '');
									} else {
										debouncedSearch(value);
									}
								}}
								placeholder="Search users..."
							/>
						</div>
					</div>
					<div style={styles.table}>
						<DataGridPro
							columns={columns}
							columnHeaderHeight={45}
							loading={usersFetching}
							slots={{
								pagination: CustomPagination,
								noRowsOverlay: NoUsersRows,
								noResultsOverlay: NoUsersRows,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'linear-progress',
									variant: 'linear-progress',
								},
							}}
							rows={usersData.rows}
							rowCount={rowCount}
							rowHeight={60}
							checkboxSelection
							rowSelectionModel={selectedUserIds}
							onRowSelectionModelChange={(newSelection) => {
								setSelectedUserIds(newSelection);
							}}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							pagination
							paginationMode="server"
							paginationModel={userConstraints}
							onPaginationModelChange={updateUserConstraints}
							disableColumnSelector
							disableColumnMenu
							pinnedColumns={pinnedColumns}
							style={styles.tableOverrides}
						/>
					</div>
				</div>

				{showBulkAssignDialog && (
					<BulkDeskAssignmentDialog
						selectedUserIds={selectedUserIds as string[]}
						onClose={() => {
							setShowBulkAssignDialog(false);
							setSelectedUserIds([]);
						}}
					/>
				)}

				{editingUserId && (
					<EditUserDeskAssignmentsDialog userId={editingUserId} onClose={() => setEditingUserId(null)} />
				)}
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
		height: '100%',
		minHeight: 0,
		padding: '24px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
		...dataGridFocusStyles,
	},
	actionsContainer: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
