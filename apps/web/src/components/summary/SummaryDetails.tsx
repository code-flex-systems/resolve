'use client';
import { useChecklistStore } from '@/stores/useChecklistStore';
import { useMemo } from 'react';
import { SummarySegment } from '@/config/enums';

import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useChecklistParams } from '@/hooks/useChecklistParams';
import IconHeaderCell from '../common/IconHeaderCell';
import Card from '@/components/ui/Card';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

const COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'page_title',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'question_text',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'answer_texts',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'response_text',
		header: (ctx) => <IconHeaderCell {...ctx} />,
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
		<Card variant="beveled" padding="md" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
			<DataTable
				columns={columns}
				headerHeight={45}
				loading={isLoadingDetails}
				rows={summaryDetails.rows}
				rowCount={summaryDetails.count ?? 0}
				rowHeight={40}
				getRowId={(row) => row.question_id}
				paginationMode="server"
				paginationModel={checklistSummaryContraints}
				onPaginationModelChange={updateChecklistSummaryConstraints}
			/>
		</Card>
	);
}
