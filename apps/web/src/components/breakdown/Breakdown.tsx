'use client';
import * as selectors from '@/state/breakdown/selectors';
import useStore, { useBreakdownSlice } from '@/state/store';
import { useShallow } from 'zustand/react/shallow';
import { Paper, Typography } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import IconHeaderCell from '../common/IconHeaderCell';
import { AccountCircle, ContentPasteSearch } from '@mui/icons-material';
import { formatMDYAbv } from '@/lib/utils/utils';
import Toolbar from '../common/Toolbar';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { usePageTrpc } from '@/hooks/trpc/usePageTrpc';

const COLUMNS: GridColDef[] = [
	{
		headerName: 'Claim',
		field: 'claim_number',
		cellClassName: 'cell-bold',
		renderHeader: (params) => <IconHeaderCell {...params} icon={<ContentPasteSearch />} />,
		width: 150,
	},
	{
		headerName: 'Client',
		field: 'client',
		renderHeader: (params) => <IconHeaderCell {...params} icon={<AccountCircle />} />,
		width: 200,
	},
	{
		headerName: 'Response Date',
		field: 'created_at',
		valueFormatter: (value: any) => formatMDYAbv(value),
		align: 'right',
		width: 130,
	},
	{
		headerName: 'Additional Info',
		field: 'additional_info',
		flex: 1,
	},
];

export default function Breakdown(props: { instanceId: number }) {
	const { instanceId } = props;
	const breakdownInterval = useBreakdownSlice((state) => state.breakdownInterval);
	const selectedQuestionId = useBreakdownSlice((state) => state.selectedQuestionId);
	const selectedAnswer = useStore(useShallow(selectors.selectedAnswer));
	const { data: pageInstance } = usePageTrpc().getInstance({ instanceId }, { enabled: instanceId !== -1 });
	const { data: breakdown = [], isFetching: loadingBreakdown } = useResponseTrpc().listForAnswer(
		{
			answerId: selectedAnswer?.answer_id ?? -1,
			interval: breakdownInterval,
		},
		{ enabled: !selectedAnswer?.answer_id }
	);

	return (
		<div style={styles.container}>
			<Toolbar
				left={
					<Typography fontSize={17} fontStyle="italic">
						{selectedAnswer
							? `${selectedAnswer.answer_text} (p${pageInstance?.id}.q${selectedQuestionId}.a${selectedAnswer.answer_id})`
							: 'Select an answer to see all related responses'}
					</Typography>
				}
				leftWidth="80%"
				rightWidth="20%"
				height={40}
				padding={'5px 15px'}
			/>
			<Paper elevation={0} style={styles.table}>
				<DataGrid
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
		height: 'calc(100vh - 60px)',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
	},
	table: {
		width: '100%',
		height: '100%',
	},
	tableOverrides: {
		border: 'none',
	},
};
