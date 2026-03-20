'use client';

import { DataGridPro, GridColDef, GridPaginationModel } from '@mui/x-data-grid-pro';
import { useRecoveryTrpc, RecoveryEventWithDetails } from '@/hooks/trpc/useRecoveryTrpc';
import { useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DateRange } from '@mui/x-date-pickers-pro';
import { formatCurrency, formatRecoveryStatus } from '@/lib/utils/recoveryUtils';
import CustomPagination from '@/components/common/CustomPagination';
import IconHeaderCell from '@/components/common/IconHeaderCell';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';
import { containerStyles, dataGridFocusStyles } from '@/styles/theme';

const columns: GridColDef<RecoveryEventWithDetails>[] = [
	{
		field: 'recovery_date',
		headerName: 'Date',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 120,
		valueFormatter: (value: string) => dayjs(value).format('MMM DD, YYYY'),
	},
	{
		field: 'claim_number',
		headerName: 'Claim #',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		field: 'insured',
		headerName: 'Insured',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		field: 'recovery_amount',
		headerName: 'Amount',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 130,
		valueFormatter: (value: string) => formatCurrency(parseFloat(value)),
	},
	{
		field: 'recovery_source',
		headerName: 'Source',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 180,
	},
	{
		field: 'recovery_status',
		headerName: 'Status',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
		valueFormatter: (value: string) => formatRecoveryStatus(value),
	},
	{
		field: 'notes',
		headerName: 'Notes',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		flex: 1,
		minWidth: 200,
	},
];

export default function RecoveryEventsTable({
	range,
	recoveryStatus,
	recoverySource,
	checklistId,
}: {
	range: DateRange<Dayjs>;
	recoveryStatus: string | null;
	recoverySource: string;
	checklistId?: number;
}) {
	const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
	const trpcUtils = trpc.useUtils();

	// Convert DateRange to ISO strings for tRPC
	const rangeISO = useMemo(
		() =>
			range[0] && range[1] ? ([range[0].toISOString(), range[1].toISOString()] as [string, string]) : undefined,
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

	const { data = { rows: [], count: undefined }, isFetching } = useRecoveryTrpc().listRecoveryEventsWithFilters(
		{
			filters,
			limit: paginationModel.pageSize,
			offset: paginationModel.page * paginationModel.pageSize,
		},
		{
			enabled: true,
		}
	);

	const rowCountRef = useRef(0);

	const rowCount = useMemo(() => {
		if (typeof data.count === 'number') {
			rowCountRef.current = data.count;
		}
		return rowCountRef.current;
	}, [data.count]);

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
		<div style={{ ...styles.paper, ...containerStyles.beveledCard }}>
			<div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
				<span style={{ fontSize: 18, fontWeight: 600 }}>
					Recovery Events
				</span>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
					<span style={{ fontSize: 12, color: 'text.secondary' }}>
						{rowCount.toLocaleString()} event{rowCount !== 1 ? 's' : ''}
					</span>
					<ExportButton
						onExport={async () => {
							const result = await trpcUtils.recovery.exportRecoveryEvents.fetch({ filters });
							return result;
						}}
						columns={csvColumns}
						filename="recovery_events"
						size="sm"
					/>
				</div>
			</div>

			<div style={{ width: '100%', height: 400 }}>
				<DataGridPro
					rows={data.rows}
					columns={columns}
					loading={isFetching}
					rowCount={rowCount}
					pagination
					paginationMode="server"
					paginationModel={paginationModel}
					onPaginationModelChange={setPaginationModel}
					pageSizeOptions={[25, 50, 100]}
					slots={{
						pagination: CustomPagination,
					}}
					slotProps={{
						loadingOverlay: {
							noRowsVariant: 'skeleton',
							variant: 'skeleton',
						},
					}}
					sx={{
						border: 'none',
						'& .MuiDataGrid-cell': {
							fontSize: 13,
						},
						'& .MuiDataGrid-columnHeaders': {
							fontSize: 13,
							fontWeight: 600,
						},
						...dataGridFocusStyles,
					}}
					disableColumnSelector
					disableColumnMenu
				/>
			</div>
		</div>
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
