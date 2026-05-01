'use client';

import { useRecoveryTrpc, RecoveryEventWithDetails } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import type { DateRange } from '@/types/dateTypes';
import { formatCurrency, formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import Card from '@/components/ui/Card';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const columns: ColumnDef<RecoveryEventWithDetails, any>[] = [
	{
		accessorKey: 'recovery_date',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 120,
		cell: ({ getValue }) => dayjs(getValue()).format('MMM DD, YYYY'),
	},
	{
		accessorKey: 'claim_number',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 150,
	},
	{
		accessorKey: 'insured',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'recovery_amount',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 130,
		cell: ({ getValue }) => {
			const value = getValue();
			return formatCurrency(parseFloat(value));
		},
	},
	{
		accessorKey: 'recovery_source',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 180,
	},
	{
		accessorKey: 'recovery_status',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 150,
		cell: ({ getValue }) => {
			const value = getValue();
			return formatRecoveryStatus(value);
		},
	},
	{
		accessorKey: 'notes',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		minSize: 200,
	},
];

export default function RecoveryEventsTable({
	range,
	recoveryStatus,
	recoverySource,
	checklistId,
}: {
	range: DateRange<Dayjs>;
	recoveryStatus?: string | null;
	recoverySource?: string;
	checklistId?: string;
}) {
	const [paginationModel, setPaginationModel] = useState<{ page: number; pageSize: number }>({
		page: 0,
		pageSize: 25,
	});
	const trpcUtils = trpc.useUtils();

	// Convert DateRange to ISO strings for tRPC
	const rangeISO = useMemo(
		() =>
			range[0] && range[1]
				? ([range[0].toISOString(), range[1].toISOString()] as [string, string])
				: undefined,
		[range]
	);

	const filters = useMemo(
		() => ({
			...(rangeISO && { range: rangeISO }),
			...(recoverySource && { recoverySource }),
			...(recoveryStatus && { recoveryStatus: recoveryStatus as any }),
			...(checklistId && { checklistId }),
		}),
		[rangeISO, recoverySource, recoveryStatus, checklistId]
	);

	const { data = { rows: [], count: undefined }, isFetching } =
		useRecoveryTrpc().listRecoveryEventsWithFilters(
			{
				filters,
				limit: paginationModel.pageSize,
				offset: paginationModel.page * paginationModel.pageSize,
			},
			{
				enabled: true,
			}
		);

	// CSV column configuration
	const csvColumns: CsvColumn<RecoveryEventWithDetails>[] = useMemo(
		() => [
			{
				header: 'Date',
				accessor: 'recovery_date',
				formatter: (value) => dayjs(value).format('MM/DD/YYYY'),
			},
			{
				header: 'Claim Number',
				accessor: 'claim_number',
			},
			{
				header: 'Insured',
				accessor: 'insured',
			},
			{
				header: 'Amount',
				accessor: 'recovery_amount',
				formatter: (value) => `$${parseFloat(value).toFixed(2)}`,
			},
			{
				header: 'Source',
				accessor: 'recovery_source',
			},
			{
				header: 'Status',
				accessor: 'recovery_status',
				formatter: (value) => formatRecoveryStatus(value),
			},
			{
				header: 'Notes',
				accessor: 'notes',
			},
		],
		[]
	);

	return (
		<Card variant="beveled" padding="lg" style={styles.paper}>
			<div
				style={{
					width: '100%',
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 16,
				}}
			>
				<span style={{ fontSize: 18, fontWeight: 600 }}>Recovery Events</span>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<span style={{ fontSize: 12, color: 'text.secondary' }}>
						{(data?.count ?? 0).toLocaleString()} event{(data?.count ?? 0) !== 1 ? 's' : ''}
					</span>
					<ExportButton
						onExport={
							(async () => {
								const result = await trpcUtils.recovery.exportRecoveryEvents.fetch({ filters });
								return result;
							}) as any
						}
						columns={csvColumns}
						filename="recovery_events"
						size="sm"
					/>
				</div>
			</div>

			<div style={{ width: '100%', height: 400 }}>
				<DataTable
					rows={data.rows}
					columns={columns}
					loading={isFetching}
					rowCount={data?.count ?? 0}
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={setPaginationModel}
				/>
			</div>
		</Card>
	);
}

const styles = {
	paper: {
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		width: '100%',
		padding: '24px',
	},
};
