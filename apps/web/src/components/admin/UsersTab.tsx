'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Button, Fade, IconButton, Paper, Switch, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AccessTimeFilled from '@mui/icons-material/AccessTimeFilled';
import AccountCircle from '@mui/icons-material/AccountCircle';
import PersonAdd from '@mui/icons-material/PersonAdd';
import Phone from '@mui/icons-material/Phone';
import Search from '@mui/icons-material/Search';
import Shield from '@mui/icons-material/Shield';
import Person from '@mui/icons-material/Person';
import Clear from '@mui/icons-material/Clear';
import CustomPagination from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { formatMDY } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import PhoneCell from './PhoneCell';
import RoleCell from './RoleCell';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useEffect, useMemo, useRef, useState } from 'react';
import UserActionsCell from './UserActionsCell';
import useDebounce from '@/lib/utils/useDebounce';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { useUrlFilters } from '@/hooks/useUrlFilters';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'User',
		field: 'user',
		renderCell: ({ row }) => (
			<StackedHeaderCell primary={`${row.last}, ${row.first}`} secondary={row.email.toLowerCase()} />
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<AccountCircle sx={{ color: 'var(--color-neutral-300)' }} />} />
		),
		flex: 1,
	},
	{
		headerName: 'Phone',
		field: 'phone',
		renderCell: (params) => (
			<PhoneCell
				value={parsePhoneNumberFromString(params.value ?? '')?.formatNational() ?? ''}
				verified={params.row.phone_verified}
				disabled={params.row.disabled}
			/>
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Phone sx={{ color: 'var(--color-neutral-300)' }} />} />,
		width: 180,
	},
	{
		headerName: 'Role',
		field: 'role',
		renderCell: (params) => <RoleCell {...params} />,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield sx={{ color: 'var(--color-neutral-300)' }} />} />,
		width: 180,
	},
	{
		headerName: 'Status',
		field: 'status',
		renderCell: ({ row }) => (
			<StackedHeaderCell
				primary={
					row.disabled
						? 'Disabled'
						: row.onboarding_email_sent && !row.email_verified
							? 'Invited'
							: 'Verified'
				}
				secondary={formatMDY(
					row.disabled
						? row.updated_at
						: row.onboarding_email_sent && !row.email_verified
							? (row.updated_at ?? row.created_at)
							: (row.email_verified ?? row.created_at)
				)}
			/>
		),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<AccessTimeFilled sx={{ color: 'var(--color-neutral-300)' }} />} />
		),
		width: 180,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <UserActionsCell {...params} />,
		width: 120,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay text="No users found" icon={<Person sx={{ fontSize: 35, color: 'var(--color-neutral-300)' }} />} />
	);
}

export default function UsersTab() {
	const { data: session } = useClerkSession();
	const userConstraints = useAdminStore((state) => state.userConstraints);
	const toggleInviteUserDialog = useAdminStore((state) => state.toggleNewUserDialog);
	const updateUserConstraints = useAdminStore((state) => state.updateUserConstraints);

	// URL filters hook for managing filters via search params
	const { getParam, getBoolParam, setParam } = useUrlFilters();

	// Filter states from URL params
	const userSearchTerm = getParam('search') ?? '';
	const showInactiveUsers = getBoolParam('inactive');
	const showDisabled = getBoolParam('disabled');

	// Local state for search input
	const [searchTerm, setSearchTerm] = useState('');

	const { data = { rows: [], count: undefined }, isFetching } = useUserTrpc().paginated({
		disabled: showDisabled,
		inactive: showInactiveUsers,
		limit: userConstraints.pageSize,
		offset: userConstraints.page * userConstraints.pageSize,
		searchTerm: userSearchTerm,
	});
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(userSearchTerm);
	}, [userSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<Typography variant="h6" marginRight="20px">
									Users
								</Typography>
								<Switch
									size="small"
									checked={showDisabled}
									onChange={(_, checked) => setParam('disabled', checked)}
									color="warning"
									sx={{ marginLeft: '10px' }}
								/>
								<Typography fontSize={14} fontStyle="italic">
									Offboarded Accounts
								</Typography>
								<Switch
									size="small"
									checked={showInactiveUsers}
									onChange={(_, checked) => setParam('inactive', checked)}
									color="warning"
									sx={{ marginLeft: '10px' }}
								/>
								<Typography fontSize={14} fontStyle="italic">
									Inactive Accounts
								</Typography>
							</>
						}
						right={
							<>
								<Paper elevation={0} sx={styles.searchPaper}>
									<Search
										sx={{
											fontSize: 17,
											marginRight: '5px',
										}}
									/>
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
								<Button variant="contained" startIcon={<PersonAdd />} onClick={toggleInviteUserDialog}>
									Invite User
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
								pagination: CustomPagination,
								noRowsOverlay: NoRows,
								noResultsOverlay: NoRows,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'linear-progress',
									variant: 'linear-progress',
								},
							}}
							rows={data.rows}
							rowCount={rowCount}
							rowHeight={60}
							hideFooterSelectedRowCount
							pageSizeOptions={[]}
							getRowClassName={(params) => {
								if (params.row.email === session?.user?.email) return 'user-row';
								return '';
							}}
							pagination
							paginationMode="server"
							paginationModel={userConstraints}
							onPaginationModelChange={updateUserConstraints}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={styles.tableOverrides}
						/>
					</div>
				</Paper>
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
		flex: 1,
		padding: '15px 15px 0px',
		border: 1,
		borderColor: 'divider',
		minHeight: 0,
	},
	searchPaper: {
		border: 1,
		borderColor: 'divider',
		borderRadius: 3,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: 200,
		height: 35,
		marginRight: '20px',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
	textField: {
		border: 'none',
		outline: 'none',
		padding: '2px 5px',
	},
};
