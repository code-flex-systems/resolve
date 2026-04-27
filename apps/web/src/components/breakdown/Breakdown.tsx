const BASE_COLOR_LIGHT = '#9394a1';
'use client';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import IconHeaderCell from '../common/IconHeaderCell';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import useSelectedBreakdownAnswerData from '@/hooks/useSelectedBreakdownAnswerData';
import { IconQuote } from '@tabler/icons-react';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="Select an answer to see responses"
			icon={<IconQuote size={35} style={{ color: BASE_COLOR_LIGHT }} />}
		/>
	);
}
function NoResults() {
	return (
		<CustomNoRowsOverlay
			text="No responses found"
			icon={<IconQuote size={35} style={{ color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

const COLUMNS: ColumnDef<any, any>[] = [
	{
		accessorKey: 'claim_number',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 150,
	},
	{
		accessorKey: 'client',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'responder',
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'created_at',
		cell: ({ getValue }) => dayjs(getValue()).format('hh:mm A MMM D, YYYY'),
		header: (ctx) => <IconHeaderCell {...ctx} />,
		size: 200,
	},
	{
		accessorKey: 'additional_info',
		header: (ctx) => <IconHeaderCell {...ctx} />,
	},
];

export default function Breakdown() {
	const [constraints, setContraints] = useState<{ page: number; pageSize: number }>({ page: 0, pageSize: 25 });
	const selectedAnswerId = useBreakdownStore((state) => state.selectedAnswerId) ?? '';
	const breakdownClaim = useBreakdownStore((state) => state.breakdownClaim);
	const breakdownRange = useBreakdownStore((state) => state.breakdownRange);
	const breakdownUsers = useBreakdownStore((state) => state.breakdownUsers);
	const answerData = useSelectedBreakdownAnswerData();
	const today = dayjs().format('MM/DD/YYYY');
	const { data: breakdown = [], isFetching: loadingBreakdown } = useResponseTrpc().listForAnswer(
		{
			answerId: selectedAnswerId,
			filters: {
				claimId: breakdownClaim?.id,
				range: [breakdownRange[0]?.toString() ?? today, breakdownRange[1]?.toString() ?? today] as [
					string,
					string,
				],
				users: breakdownUsers.map((u) => u.id),
			},
			limit: constraints.pageSize,
			offset: constraints.page * constraints.pageSize,
		},
		{ enabled: !!selectedAnswerId }
	);

	useEffect(() => {
		setContraints({ page: 0, pageSize: 25 });
	}, [selectedAnswerId]);

	return (
		<div     style={{ flex: 1, height: '100%', flexShrink: 1, minWidth: 0 }}>
			<div  className="flex-col-start" style={styles.paper}>
				<div style={styles.table}>
					<DataTable
						columns={COLUMNS}
						headerHeight={45}
						loading={loadingBreakdown}
						rows={breakdown}
						rowCount={answerData?.answer_count ?? 0}
						rowHeight={40}
						paginationMode="server"
						paginationModel={constraints}
						onPaginationModelChange={setContraints}
					/>
				</div>
			</div>
		</div>
	);
}

const styles = {
	paper: {
		width: '100%',
		height: '100%',
		padding: '15px 15px 0px',
	},
	table: {
		width: '100%',
		height: '100%',
	},
};
