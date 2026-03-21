'use client';

import { IconSettings, IconUser, IconUserPlus } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import Toolbar from '../common/Toolbar';
import { formatMDY } from '@/lib/utils/utils';
import PhoneCell from './PhoneCell';
import RoleCell from './RoleCell';
import EmailCell from './EmailCell';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import { useEffect, useMemo, useState } from 'react';
import UserActionsCell from './UserActionsCell';
import useDebounce from '@/lib/utils/useDebounce';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import SearchInput from '../common/SearchInput';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const getColumns = (isManageMode: boolean): ColumnDef<any, any>[] => [
	{
		accessorKey: 'name',
		header: 'Name',
		cell: ({ row: { original: row } }) => (
			<span style={{ fontWeight: 500 }}>{row.first} {row.last}</span>
		),
		size: 200,
	},
	{
		accessorKey: 'email',
		header: 'Email',
		cell: ({ row: { original: row } }) => <EmailCell value={row.email} />,
		size: 280,
	},
	{
		accessorKey: 'phone',
		header: 'Phone',
		cell: ({ row: { original: row } }) => <PhoneCell value={row.phone} />,
		size: 160,
	},
	{
		accessorKey: 'role',
		header: 'Role',
		cell: ({ row: { original: row } }) => <RoleCell row={row} />,
		size: 140,
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row: { original: row } }) => {
			const statusText = row.disabled
				? 'Disabled'
				: row.onboarding_email_sent && !row.email_verified
					? 'Invited'
					: 'Verified';
			const statusDate = formatMDY(
				row.disabled
					? row.updated_at
					: row.onboarding_email_sent && !row.email_verified
						? (row.updated_at ?? row.created_at)
						: (row.email_verified ?? row.created_at)
			);
			return (
				<span>
					{statusText}
					{statusDate && <span style={{ color: 'var(--text-muted)', marginLeft: 6, fontSize: 12 }}>{statusDate}</span>}
				</span>
			);
		},
		size: 200,
	},
	{
		header: '',
		accessorKey: 'actions',
		cell: ({ row: { original: row } }) => <UserActionsCell row={row} isManageMode={isManageMode} />,
		size: 100,
		enableResizing: false,
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
	const { data = { rows: [], count: undefined }, isFetching } = useUserTrpc().paginated({
		disabled: showDisabled,
		inactive: showInactiveUsers,
		limit: userConstraints.pageSize,
		offset: userConstraints.page * userConstraints.pageSize,
		searchTerm: userSearchTerm,
	});

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(userSearchTerm);
	}, [userSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading users...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
						Manage user accounts and permissions. Invite new users by email — they'll create their own account when they accept.
					</p>
					<Toolbar
						left={
							<>
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
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={data.rows}
							rowCount={data?.count ?? 0}
							rowHeight={60}
							getRowClassName={(row, index) => {
								if (row.email === session?.user?.email) return 'user-row';
								return '';
							}}
							paginationMode="server"
							paginationModel={userConstraints}
							onPaginationModelChange={updateUserConstraints}
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					</div>
			</Card>
			</div>
		</PageTransitionWrapper>
	);
}

const styles = {
	container: {
		size: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
	},
	paper: {
		width: '100%',
		height: '100%',
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
};
