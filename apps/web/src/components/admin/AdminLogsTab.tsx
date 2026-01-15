'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Chip, Paper, PopperProps, Typography } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import dayjs, { Dayjs } from 'dayjs';
import FilterList from '@mui/icons-material/FilterList';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import Person from '@mui/icons-material/Person';
import AccessTimeFilled from '@mui/icons-material/AccessTimeFilled';
import { useAdminLogsTrpc, AdminConfigLogCursor } from '@/hooks/trpc/useAdminLogsTrpc';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import type { EntityName } from '@/api/utils/adminActionLogger';
import BasicButtonStyled from '@/components/common/BasicButtonStyled';
import CustomPagination from '@/components/common/CustomPagination';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import PageTransitionWrapper from '@/components/common/PageTransitionWrapper';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import Toolbar from '@/components/common/Toolbar';
import { useUserTrpc, GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { dataGridFocusStyles, TEXT_MUTED } from '@/styles/theme';
import AdminLogSnapshotDialog from '@/components/admin/AdminLogSnapshotDialog';
import AdminLogsFiltersPopper from '@/components/admin/AdminLogsFiltersPopper';
import { formatEntityLabelForDisplay } from '@/components/admin/AdminLogsEntityFilter';

function formatTimestamp(value?: string) {
	if (!value) return '';
	return dayjs(value).format('MM/DD/YY h:mm A');
}

function NoRowsOverlay() {
	return (
		<CustomNoRowsOverlay
			text="No logs found"
			icon={<ContentPasteSearch sx={{ fontSize: 35, color: TEXT_MUTED }} />}
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
		() => [appliedStart ? dayjs(appliedStart) : null, appliedEnd ? dayjs(appliedEnd) : null] as [
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
			phone: 'phone' in appliedUser ? appliedUser.phone ?? null : null,
		};
	}, [appliedUser]);

	const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });
	const cursorByPageRef = useRef<Map<number, AdminConfigLogCursor | null>>(new Map([[0, null]]));

	const [filtersAnchorEl, setFiltersAnchorEl] = useState<PopperProps['anchorEl']>();
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

	const filtersKey = [
		appliedEntity ?? '',
		appliedUserId ?? '',
		appliedStart ?? '',
		appliedEnd ?? '',
	].join('|');

	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [filtersKey]);

	useEffect(() => {
		cursorByPageRef.current = new Map([[0, null]]);
		setPaginationModel((prev) => ({ ...prev, page: 0 }));
	}, [paginationModel.pageSize]);

	const cursor = cursorByPageRef.current.get(paginationModel.page) ?? null;

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
		if (data?.nextCursor) {
			cursorByPageRef.current.set(paginationModel.page + 1, data.nextCursor);
		}
	}, [data?.nextCursor, paginationModel.page]);

	const columns = useMemo<GridColDef[]>(
		() => [
			{
				headerName: 'Timestamp',
				field: 'created_at',
				renderHeader: (params) => (
					<IconHeaderCell {...params} icon={<AccessTimeFilled sx={{ color: TEXT_MUTED }} />} />
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
				renderHeader: (params) => <IconHeaderCell {...params} icon={<Person sx={{ color: TEXT_MUTED }} />} />,
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
				renderHeader: (params) => <IconHeaderCell {...params} icon={<ContentPasteSearch sx={{ color: TEXT_MUTED }} />} />,
				minWidth: 140,
				flex: 0.5,
			},
			{
				headerName: 'Snapshot',
				field: 'value',
				renderHeader: (params) => <IconHeaderCell {...params} />,
				renderCell: ({ row }) => {
					if (!hasValue(row.value)) {
						return <Typography color="text.secondary">-</Typography>;
					}

					return (
						<Chip
							label="..."
							size="small"
							color="info"
							variant="outlined"
							sx={{ cursor: 'pointer' }}
							onClick={(event) => {
									event.stopPropagation();
									setSelectedValue({
										entityLabel: formatEntityLabelForDisplay(row.entity_name),
										value: row.value,
									});
								}}
						/>
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
		setFiltersAnchorEl(event.currentTarget);
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
				<Paper sx={styles.paper} className="flex-col-start">
					<Toolbar left={<Typography variant="h6">Admin Logs</Typography>} right={<></>} height={50} padding={'0px 10px'} />

					<Toolbar
						left={
							<Box display="flex" gap={1} alignItems="center">
								<BasicButtonStyled
									buttonProps={{
										onClick: handleOpenFilters,
										endIcon: <FilterList />,
									}}
								>
									Filters...
									{hasActiveFilters && (
										<Box
											component="span"
											sx={styles.filterCountBadge}
										>
											{[appliedEntity, appliedUserId, appliedStart, appliedEnd].filter(Boolean).length}
										</Box>
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
							</Box>
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
							pageSizeOptions={[25, 50, 100]}
							pagination
							paginationMode="server"
							paginationModel={paginationModel}
							onPaginationModelChange={setPaginationModel}
							disableColumnSelector
							disableRowSelectionOnClick
							disableColumnMenu
							sx={styles.tableOverrides}
						/>
					</div>
				</Paper>
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
		ml: 0.5,
		bgcolor: 'primary.main',
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
