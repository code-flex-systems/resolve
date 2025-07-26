'use client';

import { Box, Chip, Stack, Typography } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import { useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DataGridPro, GridColDef, GridPaginationModel, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { CustomPagination } from '../common/CustomPagination';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';

function DescriptionCell({ row }: GridRenderCellParams) {
	const getLogText = () => {
		switch (row.action) {
			case 'insert':
				return (
					<>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>Responded to the question</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>with answer(s)</Typography>
							{row.new_response_text ? (
								<Chip label={row.new_response_text} sx={styles.chip} />
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} label={a.label} sx={styles.chip} />
								))
							)}
						</Box>
					</>
				);
			case 'update':
				return (
					<>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>Changed their response to the question</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>from answer(s)</Typography>
							{row.old_response_text ? (
								<Chip label={row.old_response_text} sx={styles.chip} />
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} label={a.label} sx={styles.chip} />
								))
							)}
						</Box>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>to answer(s)</Typography>
							{row.new_response_text ? (
								<Chip label={row.new_response_text} sx={styles.chip} />
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} label={a.label} sx={styles.chip} />
								))
							)}
						</Box>
					</>
				);
			case 'delete':
				return (
					<>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>Cleared their response to the question</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box display="flex" justifyContent="flex-start" alignItems="center" padding="2px 0px">
							<Typography fontSize={14}>Answers were </Typography>
							{row.old_response_text ? (
								<Chip label={row.old_response_text} sx={styles.chip} />
							) : (
								row.new_answers.map((a: any, i: number) => (
									<Chip key={i} label={a.label} sx={styles.chip} />
								))
							)}
						</Box>
					</>
				);
			default:
				return '';
		}
	};

	return (
		<Stack
			display="flex"
			width="100%"
			height="100%"
			justifyContent="center"
			alignItems="flex-start"
			padding="10px 10px"
		>
			<Stack display="flex" justifyContent="flex-start" alignItems="flex-start">
				{getLogText()}
			</Stack>
			<Box display="flex" justifyContent="flex-start" alignItems="center" paddingTop="5px">
				<Typography fontSize={14} lineHeight="15px" color={BASE_COLOR_LIGHT}>
					{row.last ?? ''}, {row.first ?? ''}
				</Typography>
				<div style={styles.divider} />
				<Typography fontSize={14} lineHeight="15px" color="primary">
					{row.page_label}
				</Typography>
				<div style={styles.divider} />
				<Typography fontSize={14} lineHeight="15px" color={BASE_COLOR_LIGHT}>
					{dayjs(row.created_at).format('MMMM D, YYYY hh:mm A')}
				</Typography>
			</Box>
		</Stack>
	);
}

const COLUMNS: GridColDef[] = [
	{
		field: 'desc',
		headerName: '',
		renderCell: (params) => <DescriptionCell {...params} />,
		flex: 1,
	},
];

export default function UserActivityTable({}: { users: GetUserOutput[]; range: DateRange<Dayjs> }) {
	const [constraints, setConstraints] = useState<GridPaginationModel>({ page: 0, pageSize: 25 });
	const { data: logs = { rows: [], count: undefined }, isFetching: isFetchingLogs } = useResponseTrpc().listLogs({
		filters: {
			checklistId: 1,
		},
		limit: constraints.pageSize,
		offset: constraints.page * constraints.pageSize,
	});
	const rowCountRef = useRef(logs.count ?? 0);

	const rowCount = useMemo(() => {
		if (logs.count !== undefined) {
			rowCountRef.current = logs.count;
		}
		return rowCountRef.current;
	}, [logs.count]);

	return (
		<DataGridPro
			columns={COLUMNS}
			columnHeaderHeight={0}
			loading={isFetchingLogs}
			slots={{
				pagination: CustomPagination,
			}}
			slotProps={{
				loadingOverlay: {
					noRowsVariant: 'linear-progress',
					variant: 'linear-progress',
				},
			}}
			rows={logs.rows}
			getRowHeight={() => 'auto'}
			rowCount={rowCount}
			hideFooterSelectedRowCount
			pageSizeOptions={[]}
			getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
			pagination
			paginationMode="server"
			paginationModel={constraints}
			onPaginationModelChange={setConstraints}
			disableColumnSelector
			disableRowSelectionOnClick
			disableColumnMenu
			sx={styles.tableOverrides}
		/>
	);
}

const styles = {
	chip: {
		height: 20,
		margin: '0px 5px',
	},
	divider: {
		width: 7,
		height: 7,
		borderRadius: 10,
		backgroundColor: BASE_COLOR_LIGHT,
		margin: '0px 10px',
	},
	tableOverrides: {
		border: 'none',
	},
};
