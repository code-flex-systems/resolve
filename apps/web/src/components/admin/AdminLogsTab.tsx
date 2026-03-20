'use client';

import { IconClockFilled, IconFileSearch, IconFilter, IconUser } from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import dayjs, { Dayjs } from 'dayjs';
import { useAdminLogsTrpc, AdminConfigLogCursor } from '@/hooks/trpc/useAdminLogsTrpc';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import type { EntityName } from '@/api/utils/activityLogger';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import CustomPagination from '@/components/common/CustomPagination';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import PageTransitionWrapper from '@/components/common/PageTransitionWrapper';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import Toolbar from '@/components/common/Toolbar';
import { useUserTrpc, GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { dataGridFocusStyles } from '@/styles/theme';
import AdminLogSnapshotDialog from '@/components/admin/AdminLogSnapshotDialog';
import AdminLogsFiltersPopper from '@/components/admin/AdminLogsFiltersPopper';
import { formatEntityLabelForDisplay } from '@/components/admin/AdminLogsEntityFilter';
import useCursorPagination from '@/hooks/useCursorPagination';

function formatTimestamp(value?: string) {
	if (!value) return '';
	return dayjs(value).format('MM/DD/YY h:mm A');
}

function NoRowsOverlay() {
	return (
		<CustomNoRowsOverlay
			text="No logs found"
			icon={<IconFileSearch size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

function hasValue(value: unknown) {
	if (value === null || value === undefined) return false;
	if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
	return true;
}

export default function AdminLogsTab() {
	const { listConfigLogs } = useAdminLogsTrpc();
	const { getParam, setParams, clearParams } = useUrlFilters();
	const { get: getUser } = useUserTrpc();

	const appliedEntity = (getParam('entity') as EntityName | null) ?? null;
	const appliedUserId = getParam('user_id') ?? null;
	const appliedStart = getParam('start_date');
	const appliedEnd = getParam('end_date');

	const appliedRange = useMemo(
		() =>
			[appliedStart ? dayjs(appliedStart) : null, appliedEnd ? dayjs(appliedEnd) : null] as [
				Dayjs | null,
				Dayjs | null,
			],
		[appliedStart, appliedEnd]
	);

	const { data: appliedUser } = getUser(
		{ id: appliedUserId ?? '' },
		{
			enabled: !!appliedUserId,
		}
	);
	const appliedUserFilter = useMemo<GetUserOutput | null>(() => {
		if (!appliedUser) return null;
		return {
			id: appliedUser.id,
			first: appliedUser.first,
			last: appliedUser.last,
			email: appliedUser.email,
			phone: 'phone' in appliedUser ? (appliedUser.phone ?? null) : null,
		};
	}, [appliedUser]);

	const filtersKey = [appliedEntity ?? '', appliedUserId ?? '', appliedStart ?? '', appliedEnd ?? ''].join('|');

	const { paginationModel, setPaginationModel, cursor, registerCursor } = useCursorPagination<AdminConfigLogCursor>(
		filtersKey,
		25
	);

	const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
	const [draftEntity, setDraftEntity] = useState<EntityName | null>(null);
	const [draftRange, setDraftRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
	const [draftUsers, setDraftUsers] = useState<GetUserOutput[]>([]);

	const [selectedValue, setSelectedValue] = useState<{
		entityLabel: string;
		value: unknown;
	} | null>(null);

	useEffect(() => {
		setDraftEntity(appliedEntity);
		setDraftRange(appliedRange);
		setDraftUsers(appliedUserFilter ? [appliedUserFilter] : []);
	}, [appliedEntity, appliedRange, appliedUserFilter]);

	const startDate = appliedRange[0] ? appliedRange[0].startOf('day').toISOString() : undefined;
	const endDate = appliedRange[1] ? appliedRange[1].endOf('day').toISOString() : undefined;

	const { data, isFetching } = listConfigLogs({
		limit: paginationModel.pageSize,
		cursor: cursor ?? undefined,
		startDate: startDate ?? undefined,
		endDate: endDate ?? undefined,
		entityName: appliedEntity ?? undefined,
		userId: appliedUserId ?? undefined,
	});

	useEffect(() => {
		if (data?.nextCursor != null) {
			registerCursor(data.nextCursor);
		}
	}, [data?.nextCursor, registerCursor]);

	const columns = useMemo<GridColDef[]>(
		() => [
			{
				headerName: 'Timestamp',
				field: 'created_at',
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<IconClockFilled style={{ color: 'var(--text-muted)' }} />} />
				),
				renderCell: ({ value }) => (
					<StackedHeaderCell
						primary={formatTimestamp(value)}
						secondary={value ? dayjs(value).format('MMM D, YYYY') : '-'}
					/>
				),
				minWidth: 180,
				flex: 0.6,
			},
			{
				headerName: 'User',
				field: 'user',
				renderHeader: (params) => <IconHeaderCell {...params} icon={<IconUser style={{ color: 'var(--text-muted)' }} />} />,
				renderCell: ({ row }) => (
					<StackedHeaderCell primary={`${row.first_name} ${row.last_name}`} secondary={row.user_email} />
				),
				minWidth: 200,
				flex: 1,
			},
			{
				headerName: 'Entity',
				field: 'entity_name',
				renderHeader: (params) => <IconHeaderCell {...params} />,
				renderCell: ({ row }) => (
					<StackedHeaderCell
						primary={formatEntityLabelForDisplay(row.entity_name)}
						secondary={`ID: ${row.entity_id}`}
					/>
				),
				minWidth: 200,
				flex: 1,
			},
			{
				headerName: 'Action',
				field: 'action',
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<IconFileSearch style={{ color: 'var(--text-muted)' }} />} />
				),
				minWidth: 140,
				flex: 0.5,
			},
			{
				headerName: 'Snapshot',
				field: 'value',
				renderHeader: (params) => <IconHeaderCell {...params} />,
				renderCell: ({ row }) => {
					if (!hasValue(row.value)) {
						return <span style={{ color: 'var(--text-secondary)' }}>-</span>;
					}

					return (
						<span
							style={{ cursor: 'pointer' }}
							onClick={(event) => {
								event.stopPropagation();
								setSelectedValue({
									entityLabel: formatEntityLabelForDisplay(row.entity_name),
									value: row.value,
								});
							}}
						>
							<Chip
								size="sm"
								color="info"
								variant="outlined"
							>...</Chip>
						</span>
					);
				},
				minWidth: 120,
				sortable: false,
			},
		],
		[]
	);

	const handleOpenFilters = (event: React.MouseEvent) => {
		setDraftEntity(appliedEntity);
		setDraftRange(appliedRange);
		setDraftUsers(appliedUserFilter ? [appliedUserFilter] : []);
		setFiltersAnchorEl(event.currentTarget as HTMLElement);
	};

	const handleApplyFilters = () => {
		const [rangeStart, rangeEnd] = draftRange;

		setParams({
			entity: draftEntity ?? null,
			user_id: draftUsers[0]?.id ?? null,
			start_date: rangeStart ? rangeStart.startOf('day').toISOString() : null,
			end_date: rangeEnd ? rangeEnd.endOf('day').toISOString() : null,
		});
		setFiltersAnchorEl(null);
	};

	const handleClearFilters = useCallback(() => {
		clearParams();
	}, [clearParams]);

	const handleCloseFilters = useCallback(() => {
		setFiltersAnchorEl(null);
	}, []);

	const hasActiveFilters = Boolean(appliedEntity || appliedUserId || appliedStart || appliedEnd);

	const rows = data?.rows ?? [];
	const hasNextPage = data?.hasNextPage ?? false;

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading logs...">
			<div style={styles.container}>
				<div style={styles.paper} className="flex-col-start">
					<Toolbar
						left={<span>Admin Logs</span>}
						right={<></>}
						height={50}
						padding={'0px 10px'}
					/>

					<Toolbar
						left={
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<BasicButtonStyled
									buttonProps={{
										onClick: handleOpenFilters,
										endIcon: <IconFilter size={20} />,
									}}
								>
									Filters...
									{hasActiveFilters && (
										<div style={styles.filterCountBadge}>
											{
												[appliedEntity, appliedUserId, appliedStart, appliedEnd].filter(Boolean)
													.length
											}
										</div>
									)}
								</BasicButtonStyled>
								{hasActiveFilters && (
									<BasicButtonStyled
										buttonProps={{
											onClick: handleClearFilters,
											size: 'small',
										}}
									>
										Clear all filters
									</BasicButtonStyled>
								)}
							</div>
						}
						leftWidth="100%"
						rightWidth="0%"
						height={45}
						padding={'0px 10px'}
					/>

					<AdminLogsFiltersPopper
						anchorEl={filtersAnchorEl}
						onClose={handleCloseFilters}
						draftRange={draftRange}
						setDraftRange={setDraftRange}
						draftEntity={draftEntity}
						setDraftEntity={setDraftEntity}
						draftUsers={draftUsers}
						setDraftUsers={setDraftUsers}
						onApply={handleApplyFilters}
					/>

					<div style={styles.table}>
						<DataGridPro
							columns={columns}
							columnHeaderHeight={45}
							loading={isFetching}
							slots={{
								pagination: CustomPagination,
								noRowsOverlay: NoRowsOverlay,
								noResultsOverlay: NoRowsOverlay,
							}}
							slotProps={{
								loadingOverlay: {
									noRowsVariant: 'linear-progress',
									variant: 'linear-progress',
								},
							}}
							rows={rows}
							getRowId={(row) => row.id}
							rowCount={-1}
							paginationMeta={{ hasNextPage }}
							rowHeight={60}
							hideFooterSelectedRowCount
							pageSizeOptions={[25]}
							pagination
							paginationMode="server"
							paginationModel={paginationModel}
							onPaginationModelChange={setPaginationModel}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							style={styles.tableOverrides}
						/>
					</div>
				</div>
			</div>

			{selectedValue && (
				<AdminLogSnapshotDialog
					entityLabel={selectedValue.entityLabel}
					value={selectedValue.value}
					onClose={() => setSelectedValue(null)}
				/>
			)}
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
		height: 'calc(100% - 95px)',
	},
	filterCountBadge: {
		marginLeft: 4,
		backgroundColor: 'primary.main',
		color: 'white',
		borderRadius: '50%',
		width: 18,
		height: 18,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 11,
		fontWeight: 600,
	},
	tableOverrides: {
		borderRadius: '0 0 4px 4px',
		...dataGridFocusStyles,
	},
};
