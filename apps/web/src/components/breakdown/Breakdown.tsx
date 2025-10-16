'use client';
import { useBreakdownStore } from '@/stores/useBreakdownStore';;
import { Paper } from '@mui/material';
import { DataGridPro, GridColDef } from '@mui/x-data-grid-pro';
import IconHeaderCell from '../common/IconHeaderCell';
import { formatMDYAbv } from '@/lib/utils/utils';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';
import useSelectedBreakdownAnswerData from '@/hooks/useSelectedBreakdownAnswerData';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Claim',
		field: 'claim_number',
		cellClassName: 'cell-bold',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 150,
	},
	{
		headerName: 'Client',
		field: 'client',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		width: 200,
	},
	{
		headerName: 'Response Date',
		field: 'created_at',
		valueFormatter: (value: any) => formatMDYAbv(value),
		renderHeader: (params) => <IconHeaderCell {...params} />,
		align: 'right',
		width: 150,
	},
	{
		headerName: 'Additional Info',
		field: 'additional_info',
		renderHeader: (params) => <IconHeaderCell {...params} />,
		flex: 1,
	},
];

export default function Breakdown(props: { instanceId: number }) {
	const { instanceId } = props;
	const breakdownInterval = useBreakdownStore((state) => state.breakdownInterval);
	const selectedQuestionId = useBreakdownStore((state) => state.selectedQuestionId);
	const selectedAnswer = useSelectedBreakdownAnswerData();
	const { data: pageInstance } = usePageTrpc().getInstance({ instanceId }, { enabled: instanceId !== -1 });
	const { data: breakdown = [], isFetching: loadingBreakdown } = useResponseTrpc().listForAnswer(
		{
			answerId: selectedAnswer?.answer_id ?? -1,
			interval: breakdownInterval,
		},
		{ enabled: !!selectedAnswer?.answer_id }
	);

	return (
		<div style={styles.container}>
			<Paper elevation={0} style={styles.table}>
				<DataGridPro
					columns={COLUMNS}
					columnHeaderHeight={45}
					loading={loadingBreakdown}
					slotProps={{
						loadingOverlay: {
							noRowsVariant: 'linear-progress',
							variant: 'linear-progress',
						},
					}}
					rows={breakdown}
					rowHeight={40}
					hideFooterSelectedRowCount
					pageSizeOptions={[]}
					getRowClassName={(params) =>
						params.indexRelativeToCurrentPage % 2 === 0 ? 'striped hovered-row' : 'hovered-row'
					}
					disableColumnSelector
					disableRowSelectionOnClick
					disableColumnMenu
					sx={styles.tableOverrides}
				/>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		width: '100%',
		height: 'calc(100vh - 70px)',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		marginLeft: 5,
	},
	table: {
		width: '100%',
		height: '100%',
	},
	tableOverrides: {
		border: 'none',
	},
};
