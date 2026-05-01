'use client';

import { IconClipboard, IconEdit, IconUserCircle } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import IconHeaderCell from '../common/IconHeaderCell';
import SearchInput from '../common/SearchInput';
import { useEffect, useMemo, useState } from 'react';
import StackedHeaderCell from '../common/StackedHeaderCell';
import { useAdminStore } from '@/stores/useAdminStore';
import BulkDeskAssignmentDialog from './BulkDeskAssignmentDialog';
import EditUserDeskAssignmentsDialog from './EditUserDeskAssignmentsDialog';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import useDebounce from '@/lib/utils/useDebounce';
import DeskLocationTypeFilter from '../common/DeskLocationTypeFilter';
import DeskLocationFilter from '../common/DeskLocationFilter';
import PageTransitionWrapper from '../common/PageTransitionWrapper';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface AssignmentDetail {
	id: string;
	desk_location_id: string;
	desk_location_name: string | null;
	desk_location_type_name: string | null;
	priority: number;
}

export default function DeskAssignmentTab() {
	const userConstraints = useAdminStore((state) => state.userConstraints);
	const updateUserConstraints = useAdminStore((state) => state.updateUserConstraints);
	const [selectedUserIds, setSelectedUserIds] = useState<Record<string, boolean>>({});
	const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
	const [editingUserId, setEditingUserId] = useState<string | null>(null);

	const { getParam, setParam, setParams } = useUrlFilters();

	const userSearchTerm = getParam('search') ?? '';
	const deskLocationTypeId = getParam('desk_type') ?? null;
	const deskLocationId = getParam('desk_location') ?? null;

	const [searchTerm, setSearchTerm] = useState('');

	const { data: usersData = { rows: [], count: undefined }, isFetching: usersFetching } =
		useUserTrpc().withDeskAssignments({
			limit: userConstraints.pageSize,
			offset: userConstraints.page * userConstraints.pageSize,
			searchTerm: userSearchTerm,
			deskLocationTypeId: deskLocationTypeId ?? undefined,
			deskLocationId: deskLocationId ?? undefined,
		});

	useEffect(() => {
		setSearchTerm(userSearchTerm);
	}, [userSearchTerm]);

	const debouncedSearch = useDebounce((search: string) => setParam('search', search), 500);

	const columns: ColumnDef<any, any>[] = useMemo(
		() => [
			{
				accessorKey: 'user',
				cell: ({ row: { original: row } }) => (
					<StackedHeaderCell
						primary={`${row.first} ${row.last}`}
						secondary={row.email.toLowerCase()}
					/>
				),
				header: (params) => (
					<IconHeaderCell
						{...params}
						icon={<IconUserCircle style={{ color: 'var(--text-muted)' }} />}
					/>
				),
			},
			{
				header: 'Capacity',
				accessorKey: 'capacity',
				cell: ({ row: { original: row } }) => {
					const capacity = Number(row.capacity ?? 0);
					return (
						<span style={{ fontSize: 13 }}>
							{capacity > 0 ? `${capacity.toLocaleString()} units` : '—'}
						</span>
					);
				},
				size: 120,
			},
			{
				header: 'Desk Assignments',
				accessorKey: 'desk_assignments',
				cell: ({ row: { original: row } }) => {
					const count = Number(row.assignment_count ?? 0);
					const assignments: AssignmentDetail[] = Array.isArray(row.assignments)
						? row.assignments
						: [];
					return (
						<div
							style={{
								display: 'flex',
								flexDirection: 'column',
								gap: 4,
								padding: '8px 0',
								whiteSpace: 'normal',
							}}
						>
							<span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
								{count === 1 ? '1 desk' : `${count} desks`}
							</span>
							{assignments.length > 0 && (
								<div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
									{assignments.map((a) => (
										<span
											key={a.id}
											style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}
										>
											{a.desk_location_type_name ?? 'Unknown type'} —{' '}
											{a.desk_location_name ?? 'Unknown location'}
										</span>
									))}
								</div>
							)}
						</div>
					);
				},
				size: 320,
			},
			{
				header: 'Actions',
				accessorKey: 'actions',
				cell: ({ row: { original: row } }) => (
					<div style={styles.actionsContainer}>
						<Tooltip content="Edit desk assignments">
							<Button
								variant="icon"
								size="sm"
								color="neutral"
								onClick={() => setEditingUserId(row.id)}
							>
								<IconEdit size={15} stroke={1.5} />
							</Button>
						</Tooltip>
					</div>
				),
				size: 90,
				enableSorting: false,
			},
		],
		[]
	);

	const selectionCount = Object.keys(selectedUserIds).filter((k) => selectedUserIds[k]).length;

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading desk assignments...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<p
						style={{
							color: 'var(--text-secondary)',
							fontSize: 13,
							margin: '0 0 12px',
							lineHeight: 1.5,
						}}
					>
						Assign users to desk locations with priority levels. Lower priority numbers mean the
						user is assigned to that location first.
					</p>
					<div
						style={{
							width: '100%',
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							padding: '5px 0px',
						}}
					>
						<div
							style={{
								display: 'flex',
								justifyContent: 'flex-start',
								alignItems: 'center',
								gap: 8,
							}}
						>
							<DeskLocationTypeFilter
								value={deskLocationTypeId}
								onChange={(id: string | null) => {
									setParams({
										desk_type: id?.toString() ?? null,
										desk_location: null,
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
						<div
							style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8 }}
						>
							<Button
								variant="contained"
								startIcon={<IconClipboard size={20} />}
								onClick={() => setShowBulkAssignDialog(true)}
								disabled={selectionCount === 0}
							>
								Assign to Desk ({selectionCount})
							</Button>
						</div>
					</div>
					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={usersFetching}
							rows={usersData.rows}
							rowCount={usersData?.count ?? 0}
							rowHeight={64}
							checkboxSelection
							rowSelection={selectedUserIds}
							onRowSelectionChange={setSelectedUserIds}
							paginationMode="server"
							paginationModel={userConstraints}
							onPaginationModelChange={updateUserConstraints}
						/>
					</div>
				</Card>

				{showBulkAssignDialog && (
					<BulkDeskAssignmentDialog
						selectedUserIds={Object.keys(selectedUserIds).filter((k) => selectedUserIds[k])}
						onClose={() => {
							setShowBulkAssignDialog(false);
							setSelectedUserIds({});
						}}
					/>
				)}

				{editingUserId && (
					<EditUserDeskAssignmentsDialog
						userId={editingUserId}
						onClose={() => setEditingUserId(null)}
					/>
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
		display: 'flex',
		flexDirection: 'column' as const,
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 50px)',
	},
	actionsContainer: {
		width: '100%',
		height: '100%',
		display: 'flex',
		justifyContent: 'flex-end',
		alignItems: 'center',
	},
};
