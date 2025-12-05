'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Box, Button, Fade, IconButton, Paper, Typography } from '@mui/material';
import { DataGridPro, GridColDef, GridRowSelectionModel } from '@mui/x-data-grid-pro';
import AccountCircle from '@mui/icons-material/AccountCircle';
import Assignment from '@mui/icons-material/Assignment';
import Edit from '@mui/icons-material/Edit';
import Search from '@mui/icons-material/Search';
import Clear from '@mui/icons-material/Clear';
import IconHeaderCell from '../common/IconHeaderCell';
import { useEffect, useMemo, useRef, useState } from 'react';
import { BASE_COLOR_LIGHT, BORDER_COLOR } from '@/styles/theme';
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

function NoUsersRows() {
	return (
		<CustomNoRowsOverlay
			text="No users found"
			icon={<AccountCircle sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
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

	const COLUMNS: GridColDef[] = [
		{
			headerName: 'User',
			field: 'user',
			renderCell: ({ row }) => (
				<StackedHeaderCell primary={`${row.last}, ${row.first}`} secondary={row.email.toLowerCase()} />
			),
			renderHeader: (params) => (
				<IconHeaderCell {...params} icon={<AccountCircle style={{ color: BASE_COLOR_LIGHT }} />} />
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
			renderCell: ({ row }) => (
				<div style={styles.actionsContainer}>
					<BasicButtonStyled
						buttonProps={{
							onClick: () => setEditingUserId(row.id),
						}}
						tooltipProps={{ title: 'Edit desk assignments' }}
						icon={<Edit sx={{ fontSize: 15 }} />}
					/>
				</div>
			),
			width: 100,
			sortable: false,
			filterable: false,
			disableColumnMenu: true,
		},
	];

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Box width="100%" display="flex" justifyContent="space-between" alignItems="center">
						<Box display="flex" alignItems="center">
							<Typography variant="h6" marginRight="20px">
								Desk Assignments
							</Typography>
						</Box>
						<Box display="flex" justifyContent="flex-end" alignItems="center">
							<Button
								variant="contained"
								startIcon={<Assignment />}
								onClick={() => setShowBulkAssignDialog(true)}
								disabled={selectedUserIds.length === 0}
								sx={{ marginLeft: '10px' }}
							>
								Assign to Desk ({selectedUserIds.length})
							</Button>
						</Box>
					</Box>
					<Box
						width="100%"
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						paddingTop="5px"
					>
						<Box></Box>
						<Box display="flex" justifyContent="flex-end" alignItems="center" gap={1}>
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
							<Paper elevation={0} sx={styles.searchPaper}>
								<Search sx={{ fontSize: 17, marginRight: '5px' }} />
								<input
									placeholder="Search"
									type="text"
									style={styles.textField}
									value={searchTerm}
									onChange={(e) => {
										setSearchTerm(e.target.value);
										debouncedSearch(e.target.value);
									}}
								/>
								{searchTerm && (
									<IconButton
										size="small"
										onClick={() => {
											setSearchTerm('');
											setParam('search', '');
										}}
										sx={{ padding: '2px', marginLeft: '2px' }}
									>
										<Clear sx={{ fontSize: 16 }} />
									</IconButton>
								)}
							</Paper>
						</Box>
					</Box>
					<div style={styles.table}>
						<DataGridPro
							columns={COLUMNS}
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
							sx={styles.tableOverrides}
						/>
					</div>
				</Paper>

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
	paper: {
		width: '100%',
		height: '100%',
		border: 1,
		borderColor: 'divider',
		minHeight: 0,
		padding: '20px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
	actionsContainer: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
	searchPaper: {
		display: 'flex',
		alignItems: 'center',
		bgcolor: 'white',
		border: `1px solid ${BORDER_COLOR}`,
		borderRadius: 2,
		padding: '5px 10px',
		minWidth: 250,
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
		width: '100%',
		fontSize: 13,
		fontFamily: 'Inter',
	} as React.CSSProperties,
};
