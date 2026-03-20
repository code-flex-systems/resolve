'use client';

import { IconClockFilled, IconPhone, IconSettings, IconShield, IconUser, IconUserCircle, IconUserPlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import { DataGridPro, GridColDef, GridPinnedColumnFields } from '@mui/x-data-grid-pro';
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
import SearchInput from '../common/SearchInput';
import { dataGridFocusStyles } from '@/styles/theme';
import PageTransitionWrapper from '../common/PageTransitionWrapper';

const getColumns = (isManageMode: boolean): GridColDef[] => [
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
		headerName: 'Phone',
		field: 'phone',
		renderCell: (params) => (
			<PhoneCell
				value={parsePhoneNumberFromString(params.value ?? '')?.formatNational() ?? ''}
				verified={params.row.phone_verified}
				disabled={params.row.disabled}
			/>
		),
		renderHeader: (params) => <IconHeaderCell {...params} icon={<IconPhone style={{ color: 'var(--text-muted)' }} />} />,
		width: 180,
	},
	{
		headerName: 'Role',
		field: 'role',
		renderCell: (params) => <RoleCell {...params} />,
		renderHeader: (params) => <IconHeaderCell {...params} icon={<IconShield style={{ color: 'var(--text-muted)' }} />} />,
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
			<IconHeaderCell {...params} icon={<IconClockFilled style={{ color: 'var(--text-muted)' }} />} />
		),
		width: 180,
	},
	{
		headerName: '',
		field: 'actions',
		renderCell: (params) => <UserActionsCell {...params} isManageMode={isManageMode} />,
		width: 120,
		resizable: false,
	},
];

function NoRows() {
	return (
		<CustomNoRowsOverlay text="No users found" icon={<IconUser size={35} style={{ color: 'var(--text-muted)' }} />} />
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
	const [isManageMode, setIsManageMode] = useState(false);

	const columns = useMemo(() => getColumns(isManageMode), [isManageMode]);
	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

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
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading users...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={
							<>
								<span style={{ marginRight: '20px' }}>
									Users
								</span>
								<Switch
									size="sm"
									checked={showDisabled}
									onChange={(checked) => setParam('disabled', checked)}
									color="warning"
									style={{ marginLeft: '10px' }}
								/>
								<span style={{ fontSize: 14, fontStyle: 'italic' }}>
									Offboarded Accounts
								</span>
								<Switch
									size="sm"
									checked={showInactiveUsers}
									onChange={(checked) => setParam('inactive', checked)}
									color="warning"
									style={{ marginLeft: '10px' }}
								/>
								<span style={{ fontSize: 14, fontStyle: 'italic' }}>
									Inactive Accounts
								</span>
							</>
						}
						right={
							<>
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
								<Button
									variant="contained"
									startIcon={<IconUserPlus size={20} />}
									onClick={toggleInviteUserDialog}
									style={{ marginLeft: 16 }}
								>
									Invite User
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
							columns={columns}
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
							pinnedColumns={pinnedColumns}
							style={styles.tableOverrides}
						/>
					</div>
				</div>
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
		flex: 1,
		padding: '24px 24px 0px',
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
