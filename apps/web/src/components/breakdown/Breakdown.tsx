'use client';
import { useBreakdownStore } from '@/stores/useBreakdownStore';
import IconHeaderCell from '../common/IconHeaderCell';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import useSelectedBreakdownAnswerData from '@/hooks/useSelectedBreakdownAnswerData';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';
import Card from '@/components/ui/Card';
import styles from './Breakdown.module.css';

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
	const [constraints, setContraints] = useState<{ page: number; pageSize: number }>({
		page: 0,
		pageSize: 25,
	});
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
		<Card variant="beveled" padding="md" className={styles.card}>
			<div className={styles.table}>
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
		</Card>
	);
}
