'use client';

import {
	IconClipboardCheck,
	IconClockFilled,
	IconFileSearch,
	IconFilter,
	IconUser,
} from '@tabler/icons-react';
import Card from '@/components/ui/Card';
import Chip from '@/components/ui/Chip';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { useAdminLogsTrpc, ClaimActivityLogCursor } from '@/hooks/trpc/useAdminLogsTrpc';
import { useUrlFilters } from '@/hooks/useUrlFilters';
import type { EntityName } from '@/api/utils/activityLogger';
import CustomNoRowsOverlay from '@/components/common/CustomNoRowsOverlay';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import PageTransitionWrapper from '@/components/common/PageTransitionWrapper';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import Toolbar from '@/components/common/Toolbar';
import { useUserTrpc, GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useClaimTrpc, Claim } from '@/hooks/trpc/useClaimTrpc';
import AdminLogSnapshotDialog from '@/components/admin/AdminLogSnapshotDialog';
import ClaimActivityLogsFiltersPopper from '@/components/admin/ClaimActivityLogsFiltersPopper';
import { formatEntityLabelForDisplay } from '@/components/admin/AdminLogsEntityFilter';
import useCursorPagination from '@/hooks/useCursorPagination';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import Button from '@/components/ui/Button';

const ACTOR_TYPE_VALUES = new Set(['admin', 'user']);

const isActorType = (value: string | null): value is 'admin' | 'user' =>
	value !== null && ACTOR_TYPE_VALUES.has(value);

function formatTimestamp(value?: string) {
	if (!value) return '';
	return dayjs(value).format('MM/DD/YY h:mm A');
}

function NoRowsOverlay() {
	return (
		<CustomNoRowsOverlay
			text="No claim activity logs found"
			icon={<IconFileSearch size={35} style={{ color: 'var(--text-muted)' }} />}
		/>
	);
}

function hasValue(value: unknown) {
	if (value === null || value === undefined) return false;
	if (typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0;
	return true;
}

export default function AdminClaimActivityLogsTab() {
	const { listClaimActivityLogs } = useAdminLogsTrpc();
	const { getParam, setParams, clearParams } = useUrlFilters();
	const { get: getUser } = useUserTrpc();
	const { get: getClaim } = useClaimTrpc();

	const appliedEntity = (getParam('entity') as EntityName | null) ?? null;
	const appliedUserId = getParam('user_id') ?? null;
	const appliedStart = getParam('start_date');
	const appliedEnd = getParam('end_date');
	const appliedActorTypeParam = getParam('actor_type');
	const appliedActorType = isActorType(appliedActorTypeParam) ? appliedActorTypeParam : null;
	const appliedClaimIdParam = getParam('claim_id');
	const normalizedClaimId = appliedClaimIdParam || null;

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
	const { data: appliedClaim } = getClaim(
		{ claimId: normalizedClaimId ?? '' },
		{
			enabled: !!normalizedClaimId,
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

	const appliedClaimFilter = useMemo<Claim | null>(() => {
		if (!appliedClaim) return null;
		return appliedClaim;
	}, [appliedClaim]);

	const filtersKey = [
		appliedEntity ?? '',
		appliedUserId ?? '',
		appliedStart ?? '',
		appliedEnd ?? '',
		appliedActorType ?? '',
		normalizedClaimId ?? '',
	].join('|');

	const { paginationModel, setPaginationModel, cursor, registerCursor } =
		useCursorPagination<ClaimActivityLogCursor>(filtersKey, 25);

	const [filtersAnchorEl, setFiltersAnchorEl] = useState<HTMLElement | null>(null);
	const [draftEntity, setDraftEntity] = useState<EntityName | null>(null);
	const [draftRange, setDraftRange] = useState<[Dayjs | null, Dayjs | null]>([null, null]);
	const [draftUsers, setDraftUsers] = useState<GetUserOutput[]>([]);
	const [draftClaim, setDraftClaim] = useState<Claim | null>(null);
	const [draftActorType, setDraftActorType] = useState<'admin' | 'user' | null>(null);

	const [selectedValue, setSelectedValue] = useState<{
		entityLabel: string;
		value: unknown;
	} | null>(null);

	useEffect(() => {
		setDraftEntity(appliedEntity);
		setDraftRange(appliedRange);
		setDraftUsers(appliedUserFilter ? [appliedUserFilter] : []);
		setDraftClaim(appliedClaimFilter);
		setDraftActorType(appliedActorType);
	}, [appliedEntity, appliedRange, appliedUserFilter, appliedClaimFilter, appliedActorType]);

	const startDate = appliedRange[0] ? appliedRange[0].startOf('day').toISOString() : undefined;
	const endDate = appliedRange[1] ? appliedRange[1].endOf('day').toISOString() : undefined;

	const { data, isFetching } = listClaimActivityLogs({
		limit: paginationModel.pageSize,
		cursor: cursor ?? undefined,
		startDate: startDate ?? undefined,
		endDate: endDate ?? undefined,
		entityName: appliedEntity ?? undefined,
		userId: appliedUserId ?? undefined,
		claimId: normalizedClaimId ?? undefined,
		actorType: appliedActorType ?? undefined,
	});

	useEffect(() => {
		if (data?.nextCursor != null) {
			registerCursor(data.nextCursor);
		}
	}, [data?.nextCursor, registerCursor]);

	const columns = useMemo<ColumnDef<any, any>[]>(
		() => [
			{
				accessorKey: 'created_at',
				header: (params) => (
					<IconHeaderCell
						{...params}
						icon={<IconClockFilled style={{ color: 'var(--text-muted)' }} />}
					/>
				),
				cell: ({ getValue }: any) => {
					const value = getValue();
					return (
						<StackedHeaderCell
							primary={formatTimestamp(value)}
							secondary={value ? dayjs(value).format('MMM D, YYYY') : '-'}
						/>
					);
				},
				minSize: 180,
			},
			{
				accessorKey: 'claim_number',
				header: (params) => (
					<IconHeaderCell
						{...params}
						icon={<IconFileSearch style={{ color: 'var(--text-muted)' }} />}
					/>
				),
				cell: ({ row: { original: row } }) => (
					<StackedHeaderCell
						primary={row.claim_number || `Claim ${row.claim_id}`}
						secondary={row.claim_insured || `ID: ${row.claim_id}`}
					/>
				),
				minSize: 200,
			},
			{
				accessorKey: 'user',
				header: (params) => (
					<IconHeaderCell {...params} icon={<IconUser style={{ color: 'var(--text-muted)' }} />} />
				),
				cell: ({ row: { original: row } }) => (
					<StackedHeaderCell
						primary={`${row.first_name} ${row.last_name}`}
						secondary={row.user_email}
					/>
				),
				minSize: 200,
			},
			{
				accessorKey: 'actor_type',
				header: (params) => (
					<IconHeaderCell
						{...params}
						icon={<IconClipboardCheck style={{ color: 'var(--text-muted)' }} />}
					/>
				),
				cell: ({ getValue }: any) => {
					const value = getValue();
					const label = value === 'admin' ? 'Admin' : value === 'user' ? 'User' : 'Unknown';
					return (
						<Chip size="sm" color={value === 'admin' ? 'info' : 'neutral'} variant="outlined">
							{label}
						</Chip>
					);
				},
				minSize: 140,
			},
			{
				accessorKey: 'entity_name',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				cell: ({ row: { original: row } }) => (
					<StackedHeaderCell
						primary={formatEntityLabelForDisplay(row.entity_name)}
						secondary={`ID: ${row.entity_id}`}
					/>
				),
				minSize: 200,
			},
			{
				accessorKey: 'action',
				header: (params) => (
					<IconHeaderCell
						{...params}
						icon={<IconFileSearch style={{ color: 'var(--text-muted)' }} />}
					/>
				),
				minSize: 140,
			},
			{
				accessorKey: 'value',
				header: (ctx) => <IconHeaderCell {...ctx} />,
				cell: ({ row: { original: row } }) => {
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
							<Chip size="sm" color="info" variant="outlined">
								...
							</Chip>
						</span>
					);
				},
				minSize: 120,
				enableSorting: false,
			},
		],
		[]
	);

	const handleOpenFilters = (event: React.MouseEvent) => {
		setDraftEntity(appliedEntity);
		setDraftRange(appliedRange);
		setDraftUsers(appliedUserFilter ? [appliedUserFilter] : []);
		setDraftClaim(appliedClaimFilter);
		setDraftActorType(appliedActorType);
		setFiltersAnchorEl(event.currentTarget as HTMLElement);
	};

	const handleApplyFilters = () => {
		const [rangeStart, rangeEnd] = draftRange;

		setParams({
			entity: draftEntity ?? null,
			user_id: draftUsers[0]?.id ?? null,
			claim_id: draftClaim?.id ? String(draftClaim.id) : null,
			actor_type: draftActorType ?? null,
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

	const hasActiveFilters = Boolean(
		appliedEntity ||
		appliedUserId ||
		appliedStart ||
		appliedEnd ||
		appliedActorType ||
		normalizedClaimId
	);

	const rows = data?.rows ?? [];
	const hasNextPage = data?.hasNextPage ?? false;

	return (
		<PageTransitionWrapper criticalDataReady={true} loadingMessage="Loading claim activity logs...">
			<div style={styles.container}>
				<Card variant="beveled" padding="md" style={styles.paper}>
					<Toolbar
						left={<span>Claim Activity Logs</span>}
						right={<></>}
						height={50}
						padding={'0px 10px'}
					/>

					<Toolbar
						left={
							<div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
								<Button
									variant="outlined"
									onClick={handleOpenFilters}
									endIcon={<IconFilter size={16} />}
								>
									Filters...
									{hasActiveFilters && (
										<div style={styles.filterCountBadge}>
											{
												[
													appliedEntity,
													appliedUserId,
													appliedStart,
													appliedEnd,
													appliedActorType,
													normalizedClaimId,
												].filter(Boolean).length
											}
										</div>
									)}
								</Button>
								{hasActiveFilters && (
									<Button variant="outlined" onClick={handleClearFilters} size="sm">
										Clear all filters
									</Button>
								)}
							</div>
						}
						leftWidth="100%"
						rightWidth="0%"
						height={45}
						padding={'0px 10px'}
					/>

					<ClaimActivityLogsFiltersPopper
						anchorEl={filtersAnchorEl}
						onClose={handleCloseFilters}
						draftRange={draftRange}
						setDraftRange={setDraftRange}
						draftEntity={draftEntity}
						setDraftEntity={setDraftEntity}
						draftUsers={draftUsers}
						setDraftUsers={setDraftUsers}
						draftClaim={draftClaim}
						setDraftClaim={setDraftClaim}
						draftActorType={draftActorType}
						setDraftActorType={setDraftActorType}
						onApply={handleApplyFilters}
					/>

					<div style={styles.table}>
						<DataTable
							columns={columns}
							headerHeight={45}
							loading={isFetching}
							rows={rows}
							getRowId={(row) => row.id}
							rowHeight={60}
							paginationMode="server"
							paginationModel={paginationModel}
							onPaginationModelChange={setPaginationModel}
						/>
					</div>
				</Card>
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
		display: 'flex',
		flexDirection: 'column' as const,
		width: '100%',
		height: '100%',
		minHeight: 0,
	},
	table: {
		width: '100%',
		height: 'calc(100% - 95px)',
	},
	filterCountBadge: {
		marginLeft: 4,
		backgroundColor: 'var(--text-accent)',
		color: 'var(--bg-primary)',
		borderRadius: '50%',
		size: 18,
		height: 18,
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		fontSize: 11,
		fontWeight: 600,
	},
};
