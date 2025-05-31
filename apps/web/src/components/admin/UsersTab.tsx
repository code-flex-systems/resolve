import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Button, Paper, Switch, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { AccessTimeFilled, AccountCircle, AddBox, Email, Phone, Shield } from '@mui/icons-material';
import { CustomPagination } from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import { toggleNewUserDialog, updateUserConstraints } from '@/state/admin/actions';
import IconHeaderCell from '../common/IconHeaderCell';
import { formatMDY } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import VerifiedCell from './VerifiedCell';
import RoleCell from './RoleCell';
import { useSession } from 'next-auth/react';
import { useState } from 'react';
import ActionsCell from './ActionsCell';
import { useAdminSlice } from '@/state/store';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'User',
		field: 'user',
		cellClassName: 'cell-bold',
		valueGetter: (_, row) => `${row.last}, ${row.first}`,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<AccountCircle />} />,
		flex: 1,
	},
	{
		headerName: 'Email',
		field: 'email',
		renderCell: (params) => (
			<VerifiedCell value={params.value} verified={params.row.email_verified} disabled={params.row.disabled} />
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Email />} />,
		flex: 2,
	},
	{
		headerName: 'Phone',
		field: 'phone',
		renderCell: (params) => (
			<VerifiedCell
				value={parsePhoneNumberFromString(params.value)?.formatNational() ?? ''}
				verified={params.row.phone_verified}
				disabled={params.row.disabled}
			/>
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Phone />} />,
		width: 180,
	},
	{
		headerName: 'Role',
		field: 'role',
		renderCell: (params) => <RoleCell {...params} />,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield />} />,
		width: 180,
	},
	{
		headerName: 'Onboarded',
		field: 'created_at',
		valueFormatter: (value) => formatMDY(value),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<AccessTimeFilled />} />,
		width: 180,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <ActionsCell {...params} />,
		width: 120,
		resizable: false,
	},
];

export default function UsersTab() {
	const [showDisabled, setShowDisabled] = useState(false);
	const { data: session } = useSession();
	const userConstraints = useAdminSlice((state) => state.userConstraints);
	const { data = { rows: [], count: 0 }, isFetching } = useUserTrpc().list({
		disabled: showDisabled,
		limit: userConstraints.pageSize,
		offset: userConstraints.page * userConstraints.pageSize,
	});

	return (
		<>
			<Toolbar
				left={
					<>
						<Switch
							size="small"
							checked={showDisabled}
							onChange={(_, checked) => setShowDisabled(checked)}
							color="warning"
						/>
						<Typography fontSize={14} fontStyle="italic">
							Offboarded Accounts
						</Typography>
					</>
				}
				right={
					<Button variant="contained" startIcon={<AddBox />} onClick={toggleNewUserDialog}>
						New user
					</Button>
				}
				height={50}
				padding={0}
			/>
			<Paper style={styles.table}>
				<DataGrid
					columns={COLUMNS}
					columnHeaderHeight={45}
					loading={isFetching}
					slots={{
						pagination: CustomPagination,
					}}
					slotProps={{
						loadingOverlay: {
							noRowsVariant: 'linear-progress',
							variant: 'linear-progress',
						},
					}}
					rows={data.rows}
					rowCount={data.count}
					rowHeight={60}
					hideFooterSelectedRowCount
					pageSizeOptions={[]}
					getRowClassName={(params) => {
						if (params.row.email === session?.user?.email) return 'user-row';
						return params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '';
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
			</Paper>
		</>
	);
}

const styles = {
	table: {
		// flex: 1,
		width: '100%',
		height: '100%',
		overflow: 'auto',
	},
	tableOverrides: {
		border: 'none',
	},
};
