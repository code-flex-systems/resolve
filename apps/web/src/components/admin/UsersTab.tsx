'use client';

import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Button, Fade, InputAdornment, Paper, Switch, TextField, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import AccessTimeFilled from '@mui/icons-material/AccessTimeFilled';
import AccountCircle from '@mui/icons-material/AccountCircle';
import AddBox from '@mui/icons-material/AddBox';
import Phone from '@mui/icons-material/Phone';
import Search from '@mui/icons-material/Search';
import Shield from '@mui/icons-material/Shield';
import Upload from '@mui/icons-material/Upload';
import Person from '@mui/icons-material/Person';
import { CustomPagination } from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import IconHeaderCell from '../common/IconHeaderCell';
import { formatMDY } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import PhoneCell from './PhoneCell';
import RoleCell from './RoleCell';
import { useSession } from 'next-auth/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import UserActionsCell from './UserActionsCell';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { CSVImportWizard } from '../common/CSV-wizard/CSVWizard';
import config from '@/config/config';
import { createUsersInput } from '@/schemas/userSchemas';
import useDebounce from '@/lib/utils/useDebounce';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';

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
		headerName: 'Phone',
		field: 'phone',
		renderCell: (params) => (
			<PhoneCell
				value={parsePhoneNumberFromString(params.value ?? '')?.formatNational() ?? ''}
				verified={params.row.phone_verified}
				disabled={params.row.disabled}
			/>
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Phone style={{ color: BASE_COLOR_LIGHT }} />} />,
		width: 180,
	},
	{
		headerName: 'Role',
		field: 'role',
		renderCell: (params) => <RoleCell {...params} />,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield style={{ color: BASE_COLOR_LIGHT }} />} />,
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
			<IconHeaderCell {...params} icon={<AccessTimeFilled style={{ color: BASE_COLOR_LIGHT }} />} />
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
		<CustomNoRowsOverlay text="No users found" icon={<Person sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />} />
	);
}

export default function UsersTab() {
	const { data: session } = useSession();
	const showImportUsersDialog = useAdminStore((state) => state.showImportUsersDialog);
	const showInactiveUsers = useAdminStore((state) => state.showInactiveUsers);
	const userConstraints = useAdminStore((state) => state.userConstraints);
	const userSearchTerm = useAdminStore((state) => state.userSearchTerm);
	const setShowInactiveUsers = useAdminStore((state) => state.setShowInactiveUsers);
	const toggleImportUsersDialog = useAdminStore((state) => state.toggleImportUsersDialog);
	const toggleNewUserDialog = useAdminStore((state) => state.toggleNewUserDialog);
	const updateUserConstraints = useAdminStore((state) => state.updateUserConstraints);
	const updateUserSearchTerm = useAdminStore((state) => state.updateUserSearchTerm);
	const [searchTerm, setSearchTerm] = useState('');
	const [showDisabled, setShowDisabled] = useState(false);

	const { data = { rows: [], count: undefined }, isFetching } = useUserTrpc().paginated({
		disabled: showDisabled,
		inactive: showInactiveUsers,
		limit: userConstraints.pageSize,
		offset: userConstraints.page * userConstraints.pageSize,
		searchTerm: userSearchTerm,
	});
	const { mutateAsync: createUsers, isPending: creating } = useUserTrpc().create;
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	const debouncedSearch = useCallback(
		useDebounce((search: string) => updateUserSearchTerm(search), 500),
		[]
	);

	return (
		<Fade in={true} timeout={1000}>
			<div style={styles.container}>
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar
						left={
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
								</Paper>
								<Switch
									size="small"
									checked={showDisabled}
									onChange={(_, checked) => setShowDisabled(checked)}
									color="warning"
									sx={{ marginLeft: '10px' }}
								/>
								<Typography fontSize={14} fontStyle="italic">
									Offboarded Accounts
								</Typography>
								<Switch
									size="small"
									checked={showInactiveUsers}
									onChange={(_, checked) => setShowInactiveUsers(checked)}
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
								<Button
									variant="contained"
									color="secondary"
									startIcon={<Upload />}
									onClick={toggleImportUsersDialog}
									sx={{ marginRight: '10px' }}
								>
									Import
								</Button>
								<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewUserDialog}>
									User
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

					{showImportUsersDialog && (
						<CSVImportWizard
							fields={config.USER_FIELDS.map((f) => ({ ...f, required: true }))}
							validateRow={(row: any) =>
								createUsersInput.safeParse({
									users: [row],
								})
							}
							onSubmit={(rows) => createUsers({ users: rows })}
							submitting={creating}
							onClose={toggleImportUsersDialog}
						/>
					)}
				</Paper>
			</div>
		</Fade>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 75px)',
		paddingTop: 20,
	},
	paper: {
		width: '100%',
		height: '100%',
		padding: '15px 15px 0px',
		border: 1,
		borderColor: 'divider',
	},
	searchPaper: {
		border: 1,
		borderColor: 'divider',
		borderRadius: 3,
		display: 'flex',
		justifyContent: 'center',
		alignItems: 'center',
		width: 200,
		height: 40,
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
