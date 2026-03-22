'use client';

import { formatAmount, formatMDY, formatUser } from '@/lib/utils/utils';
import IconHeaderCell from '../../common/IconHeaderCell';
import { useMemo, useState } from 'react';
import { ChecklistClaimsOutput, useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import type { DateRange } from '@/types/dateTypes';
import dayjs, { Dayjs } from 'dayjs';
import ClaimStatusCell from './ClaimStatusCell';
import { Claim } from '@/hooks/trpc/useClaimTrpc';
import ClaimClientCell from './ClaimClientCell';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { useMetricsStore } from '@/stores/useMetricsStore';
import StackedHeaderCell from '@/components/common/StackedHeaderCell';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import { ClaimStatus } from '@/config/enums';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const PINNED_COLUMNS: { left?: string[]; right?: string[] } = {
	left: ['status'],
};

const COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'status',
		header: () => <IconHeaderCell />,
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return <ClaimStatusCell {...params} />; },
		size: 150,
	},
	{
		accessorKey: 'claim_number',
		header: () => <IconHeaderCell />,
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return <StackedHeaderCell primary={params.value} secondary={params.row.checklist_name} />; },
		size: 220,
	},
	{
		accessorKey: 'client',
		header: () => <IconHeaderCell />,
		size: 200,
	},
	{
		accessorKey: 'expected_recovery',
		header: () => <IconHeaderCell />,
		cell: (info: any) => { const params = { row: info.row.original, value: info.getValue() }; return (
			<StackedHeaderCell
				primary={formatAmount(params.row.actual_recovery ?? 0, true)}
				secondary={formatAmount(params.value, true)}
			/>
		); },
		size: 300,
	},
	{
		accessorKey: 'assignee',
		header: () => <IconHeaderCell />,
		cell: (info: any) => {
			const params = { row: info.row.original, value: info.getValue() };
			const user = formatUser({
				first: params.row.assignee_first,
				last: params.row.assignee_last,
				email: params.row.assignee_email,
			});
			return <StackedHeaderCell primary={user} secondary={params.row.assignee_email} />;
		},
		size: 250,
	},
	// {
	// 	header: 'Initial assignee',
	// 	accessorKey: 'created_by',
	// 	header: () => <IconHeaderCell />,
	// 	cell: (info: any) => { const params = { row: info.row.original, value: info.getValue(), id: info.row.id }; {
	// 		const user = formatUser({
	// 			id: params.value,
	// 			first: params.row.created_by_first,
	// 			last: params.row.created_by_last,
	// 			email: params.row.created_by_email,
	// 		});
	// 		return <StackedHeaderCell primary={user} secondary={params.row.created_by_email} />;
	// 	},
	// 	size: 220,
	// },
	{
		accessorKey: 'updated_at',
		header: () => <IconHeaderCell />,
		cell: (info: any) => { const value = info.getValue(); const row = info.row.original; return formatMDY(value ?? row.created_at); },
		size: 130,
	},
];

export default function ChecklistClaims({
	checklistId,
	user,
	range,
	setClaim,
}: {
	checklistId?: string;
	user: GetUserOutput | null;
	range: DateRange<Dayjs>;
	setClaim: (newClaim: ChecklistClaimsOutput[number] | null) => void;
}) {
	const [constraints, setContraints] = useState<{ page: number; pageSize: number }>({ page: 0, pageSize: 25 });
	const [selectionModel, setSelectionModel] = useState<Record<string, boolean>>({});
	const selectedClaimStatus = useMetricsStore((state) => state.selectedClaimStatus);
	const trpcUtils = trpc.useUtils();
	const today = dayjs().format('MM/DD/YYYY');

	const filters = useMemo(
		() => ({
			checklistId,
			range: [range[0]?.toString() ?? today, range[1]?.toString() ?? today] as [string, string],
			users: user ? [user.id] : [],
			claimStatus: selectedClaimStatus ?? undefined,
		}),
		[checklistId, range, user, selectedClaimStatus, today]
	);

	const { data = { rows: [], count: undefined }, isFetching } = useChecklistTrpc().listForClaims({
		filters,
		limit: constraints.pageSize,
		offset: constraints.page * constraints.pageSize,
	});

	const updateSelectionModel = (newModel: Record<string, boolean>) => {
		setSelectionModel(newModel);
		const selectedIds = Object.keys(newModel).filter(k => newModel[k]);
		const newClaim = selectedIds.length
			? (data.rows.find((c) => `${c.checklist_id}:${c.claim_id}` === selectedIds[0]) ?? null)
			: null;
		setClaim(newClaim);
	};

	// CSV column configuration matching table display
	const csvColumns: CsvColumn<ChecklistClaimsOutput[number]>[] = useMemo(
		() => [
			{
				header: 'Status',
				accessor: 'status',
				formatter: (value) => {
					// Convert ClaimStatus enum to readable text
					switch (value) {
						case ClaimStatus.SUBMITTED:
							return 'Submitted';
						case ClaimStatus.IN_PROGRESS:
							return 'In Progress';
						case ClaimStatus.BLOCKED:
							return 'Blocked';
						case ClaimStatus.UNWORKED:
							return 'Unworked';
						default:
							return value || '';
					}
				},
			},
			{
				header: 'Claim Number',
				accessor: 'claim_number',
			},
			{
				header: 'Checklist',
				accessor: 'checklist_name',
			},
			{
				header: 'Client',
				accessor: 'client',
			},
			{
				header: 'Actual Recovery',
				accessor: 'actual_recovery',
				formatter: (value) => formatAmount(value, true),
			},
			{
				header: 'Current Assignee',
				accessor: (row) =>
					formatUser({
						first: row.assignee_first ?? '',
						last: row.assignee_last ?? '',
						email: row.assignee_email ?? '',
					}),
			},
			{
				header: 'Assignee Email',
				accessor: 'assignee_email',
			},
			{
				header: 'Last Update',
				accessor: (row) => row.updated_at ?? row.created_at,
				formatter: (value) => formatMDY(value),
			},
		],
		[]
	);

	return (
		<div className="flex-col-start" style={styles.container}>
			<div className="flex-col-start" style={styles.paper}>
				<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
					<span style={{ fontSize: 18, fontWeight: 600 }}>
						Assigned Claims
					</span>
					<div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
						<span style={{ fontSize: 12, color: 'text.secondary', marginRight: '20px' }}>
							{(data?.count ?? 0).toLocaleString()} claim{(data?.count ?? 0) !== 1 ? 's' : ''}
						</span>
						<ExportButton
							onExport={async () => {
								const result = await trpcUtils.checklist.exportChecklistClaims.fetch({ filters });
								return result;
							}}
							columns={csvColumns}
							filename="checklist_claims"
							size="sm"
						/>
					</div>
				</div>
				<div style={styles.table}>
					<DataTable
						columns={COLUMNS}
						headerHeight={45}
						loading={isFetching}
						rows={Array.isArray(data.rows) ? data.rows : []}
						rowCount={data?.count ?? 0}
						rowHeight={60}
						getRowId={(row) => `${row.checklist_id}:${row.claim_id}`}
						rowSelection={selectionModel}
						onRowSelectionChange={updateSelectionModel}
						paginationMode="server"
						paginationModel={constraints}
						onPaginationModelChange={setContraints}
						getRowClassName={(params) => 'cursor-pointer'}
					/>
				</div>
			</div>
		</div>
	);
}

const styles = {
	container: {
		minSize: 0,
		height: '100%',
		marginLeft: 20,
	},
	paper: {
		size: '100%',
		height: '100%',
		padding: '24px 24px 0px',
	},
	table: {
		size: '100%',
		height: 'calc(100% - 40px)',
	},
};
