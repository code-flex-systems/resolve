'use client';

import { IconClipboard, IconEdit, IconSettings, IconUserCircle } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import IconHeaderCell from '../common/IconHeaderCell';
import SearchInput from '../common/SearchInput';
import { useEffect, useMemo, useState } from 'react';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import BasicButtonStyled from '../common/BasicButtonStyled';
import BulkDeskAssignmentDialog from './BulkDeskAssignmentDialog';
import EditUserDeskAssignmentsDialog from './EditUserDeskAssignmentsDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';
import DeskLocationTypeFilter from '../common/DeskLocationTypeFilter';
import DeskLocationFilter from '../common/DeskLocationFilter';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

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
	const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
	const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
	const [editingUserId, setEditingUserId] = useState<string | null>(null);

	// URL filters hook
	const { getParam, setParam, setParams } = useUrlFilters();

	// Filter states from URL params
	const userSearchTerm = getParam('search') ?? '';
	const deskLocationTypeIdStr = getParam('desk_type');
	const deskLocationTypeId = deskLocationTypeIdStr ?? null;
	const deskLocationIdStr = getParam('desk_location');
	const deskLocationId = deskLocationIdStr ?? null;

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

	// Sync local search state with URL param changes
	useEffect(() => {
		setSearchTerm(userSearchTerm);
	}, [userSearchTerm]);

	// Debounce search input to URL param
	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	// Memoized columns - setEditingUserId is stable (useState setter)
	const columns: ColumnDef<any, any>[] = useMemo(
		() => [
			{
				accessorKey: 'user',
				cell: ({ row: { original: row } }) => (
					<StackedHeaderCell primary={`${row.first} ${row.last}`} secondary={row.email.toLowerCase()} />
				),
				header: (params) => (
					<IconHeaderCell {...params} icon={<IconUserCircle style={{ color: 'var(--text-muted)' }} />} />
				),
			},
			{
				header: 'Desk Assignments',
				accessorKey: 'desk_assignments',
				cell: ({ row: { original: row } }) => {
					const count = row.assignment_count || 0;
					return count === 1 ? '1 desk' : `${count} desks`;
				},
				size: 150,
			},
			{
				header: 'Actions',
				accessorKey: 'actions',
				cell: ({ row: { original: row } }) => {
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
				size: 100,
				enableSorting: false,
			},
		],
		[isManageMode]
	);

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading desk assignments...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
						Assign users to desk locations with priority levels. Lower priority numbers mean the user is assigned to that location first.
					</p>
					<div style={{ width: '100%', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
							<Button
								variant="contained"
								startIcon={<IconClipboard size={20} />}
								onClick={() => setShowBulkAssignDialog(true)}
								disabled={Object.keys(selectedUserIds).filter(k => selectedUserIds[k]).length === 0}
								style={{ marginLeft: '10px' }}
							>
								Assign to Desk ({Object.keys(selectedUserIds).filter(k => selectedUserIds[k]).length})
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
					<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '5px' }}>
						<div></div>
						<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}>
							<DeskLocationTypeFilter
								value={deskLocationTypeId}
								onChange={(id: string | null) => {
									setParams({
										desk_type: id?.toString() ?? null,
										desk_location: null, // Clear desk location when type changes
									});
								}}
								label="Desk Type"
							/>
							<DeskLocationFilter
								value={deskLocationId}
								onChange={(id: string | null) => setParam('desk_location', id ?? null)}
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
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={usersFetching}
							rows={usersData.rows}
							rowCount={usersData?.count ?? 0}
							rowHeight={60}
							checkboxSelection
							rowSelection={selectedUserIds}
							onRowSelectionChange={(newSelection) => {
								setSelectedUserIds(newSelection);
							}}
							paginationMode="server"
							paginationModel={userConstraints}
							onPaginationModelChange={updateUserConstraints}
							pinnedRight={isManageMode ? ['actions'] : []}
						/>
					</div>
				</Card>

				{showBulkAssignDialog && (
					<BulkDeskAssignmentDialog
						selectedUserIds={Object.keys(selectedUserIds).filter(k => selectedUserIds[k])}
						onClose={() => {
							setShowBulkAssignDialog(false);
							setSelectedUserIds({});
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
		size: '100%',
		height: 'calc(100% - 50px)',
	},
	actionsContainer: {
		size: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
