'use client';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useMemo } from 'react';
import { SummarySegment } from '@/config/enums';

import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import IconHeaderCell from '../common/IconHeaderCell';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'page_title',
		header: () => <IconHeaderCell />,
		size: 200,
	},
	{
		accessorKey: 'question_text',
		header: () => <IconHeaderCell />,
		size: 200,
	},
	{
		accessorKey: 'answer_texts',
		header: () => <IconHeaderCell />,
		size: 200,
	},
	{
		accessorKey: 'response_text',
		header: () => <IconHeaderCell />,
	},
];

export default function SummaryDetails() {
	const { checklistId, claimId } = useChecklistParams();
	const selectedSummarySegment = useChecklistStore((state) => state.selectedSummarySegment);
	const checklistSummaryContraints = useChecklistStore((state) => state.checklistSummaryContraints);
	const updateChecklistSummaryConstraints = useChecklistStore((state) => state.updateChecklistSummaryConstraints);
	const { data: summaryDetails = { rows: [], count: undefined }, isFetching: isLoadingDetails } =
		useChecklistTrpc().getSummaryDetail(
			{
				checklistId: checklistId!,
				claimId: claimId!,
				segment: selectedSummarySegment,
				limit: checklistSummaryContraints.pageSize,
				offset: checklistSummaryContraints.page * checklistSummaryContraints.pageSize,
			},
			{ enabled: !!checklistId && !!claimId }
		);

	const columns = useMemo(() => {
		return selectedSummarySegment === SummarySegment.UNANSWERED
			? COLUMNS.filter((c) => !['answer_texts', 'response_text'].includes((c as any).accessorKey))
			: COLUMNS;
	}, [selectedSummarySegment]);

	return (
		<div style={styles.table}>
			<DataTable
				columns={columns}
				headerHeight={45}
				loading={isLoadingDetails}
				rows={summaryDetails.rows}
				rowCount={summaryDetails.count ?? 0}
				rowHeight={40}
				getRowId={(row) => row.question_id}
				getRowClassName={(row, index) => index % 2 === 0 ? 'striped hovered-row' : 'hovered-row'}
				paginationMode="server"
				paginationModel={checklistSummaryContraints}
				onPaginationModelChange={updateChecklistSummaryConstraints}
			/>
		</div>
	);
}

const styles = {
	table: {
		height: '100%',
		overflow: 'auto',
		marginLeft: '20px',
		borderRadius: 6,
		padding: '24px 30px 12px',
	},
};
