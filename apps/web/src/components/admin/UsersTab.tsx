import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { Button, Paper, Switch, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { AccessTimeFilled, AccountCircle, AddBox, Email, Phone, Shield, Upload } from '@mui/icons-material';
import { CustomPagination } from '../common/CustomPagination';
import Toolbar from '../common/Toolbar';
import { toggleImportUsersDialog, toggleNewUserDialog, updateUserConstraints } from '@/state/admin/actions';
import IconHeaderCell from '../common/IconHeaderCell';
import { formatMDY } from '@/lib/utils/utils';
import parsePhoneNumberFromString from 'libphonenumber-js';
import VerifiedCell from './VerifiedCell';
import RoleCell from './RoleCell';
import { useSession } from 'next-auth/react';
import { useMemo, useRef, useState } from 'react';
import ActionsCell from './ActionsCell';
import { useAdminSlice } from '@/state/store';
import { BASE_COLOR } from '@/styles/theme';
import { CSVImportWizard } from '../common/CSV-wizard/CSVWizard';
import config from '@/config/config';
import { createUsersInput } from '@/schemas/userSchemas';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'User',
		field: 'user',
		cellClassName: 'cell-bold',
		valueGetter: (_, row) => `${row.last}, ${row.first}`,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<AccountCircle style={{ color: BASE_COLOR }} />} />,
		flex: 1,
	},
	{
		headerName: 'Email',
		field: 'email',
		renderCell: (params) => (
			<VerifiedCell value={params.value} verified={params.row.email_verified} disabled={params.row.disabled} />
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Email style={{ color: BASE_COLOR }} />} />,
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
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Phone style={{ color: BASE_COLOR }} />} />,
		width: 180,
	},
	{
		headerName: 'Role',
		field: 'role',
		renderCell: (params) => <RoleCell {...params} />,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<Shield style={{ color: BASE_COLOR }} />} />,
		width: 180,
	},
	{
		headerName: 'Onboarded',
		field: 'created_at',
		valueFormatter: (value) => formatMDY(value),
		renderHeader: (params) => (
			<IconHeaderCell {...params} icon={<AccessTimeFilled style={{ color: BASE_COLOR }} />} />
		),
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
	const showImportUsersDialog = useAdminSlice((state) => state.showImportUsersDialog);
	const userConstraints = useAdminSlice((state) => state.userConstraints);
	const { data = { rows: [], count: undefined }, isFetching } = useUserTrpc().list({
		disabled: showDisabled,
		limit: userConstraints.pageSize,
		offset: userConstraints.page * userConstraints.pageSize,
	});
	const { mutateAsync: createUsers, isPending: creating } = useUserTrpc().create;
	const rowCountRef = useRef(data.count ?? 0);

	const rowCount = useMemo(() => {
		if (data.count !== undefined) {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

	return (
		<div style={styles.container}>
			<Paper sx={styles.paper} className="flex-col-start">
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
						rowCount={rowCount}
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
				</div>

				{showImportUsersDialog && (
					<CSVImportWizard
						fields={config.USER_FIELDS.map((f) => ({ ...f, required: true }))}
						validateRow={(row: any) =>
							createUsersInput.safeParse({
								...row,
								password: process.env.DEFAULT_WEB_PW,
							})
						}
						onSubmit={(rows) =>
							createUsers({ users: rows.map((u) => ({ ...u, password: process.env.DEFAULT_WEB_PW })) })
						}
						submitting={creating}
						onClose={toggleImportUsersDialog}
					/>
				)}
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 135px)',
		paddingTop: 20,
	},
	paper: {
		width: '100%',
		height: '100%',
		padding: '15px 15px 0px',
		border: 1,
		borderColor: 'divider',
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	tableOverrides: {
		border: 'none',
	},
};
