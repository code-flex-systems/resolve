'use client';

import { Box, Chip, Stack, Typography } from '@mui/material';
import { BASE_COLOR_LIGHT } from '@/styles/theme';
import React, { useMemo, useRef, useState } from 'react';
import dayjs, { Dayjs } from 'dayjs';
import { DataGridPro, GridColDef, GridPaginationModel, GridRenderCellParams } from '@mui/x-data-grid-pro';
import { useResponseTrpc } from '@/hooks/trpc/useResponseTrpc';
import { CustomPagination } from '@/components/common/CustomPagination';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { DateRange } from '@mui/x-date-pickers-pro';
import { formatUser } from '@/lib/utils/utils';
import { useSession } from 'next-auth/react';
import ExportButton from '@/components/common/ExportButton';
import { CsvColumn } from '@/lib/utils/exportUtils';
import { trpc } from '@/lib/trpc';

function DescriptionCell({ row, compact }: GridRenderCellParams & { compact: boolean }) {
	const { data: session } = useSession();
	const getLogText = () => {
		switch (row.action) {
			case 'insert':
				return (
					<>
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								Responded to the question
							</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								with answer(s)
							</Typography>
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
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								Changed their response to the question
							</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								from answer(s)
							</Typography>
							{row.old_response_text ? (
								<Chip label={row.old_response_text} sx={styles.chip} />
							) : (
								row.old_answers.map((a: any, i: number) => (
									<Chip key={i} label={a.label} sx={styles.chip} />
								))
							)}
						</Box>
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								to answer(s)
							</Typography>
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
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								Cleared their response to the question
							</Typography>
							<Chip label={row.question_text} sx={styles.chip} />
						</Box>
						<Box
							display="flex"
							justifyContent="flex-start"
							alignItems="center"
							padding="2px 0px"
							flexWrap="wrap"
						>
							<Typography fontStyle="italic" fontSize={13} marginRight="5px">
								Answers were{' '}
							</Typography>
							{row.old_response_text ? (
								<Chip label={row.old_response_text} sx={styles.chip} />
							) : (
								row.old_answers.map((a: any, i: number) => (
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
			minWidth="fit-content"
			height="100%"
			justifyContent="center"
			alignItems="flex-start"
			padding="10px 10px"
		>
			<Stack display="flex" justifyContent="flex-start" alignItems="flex-start">
				{getLogText()}
			</Stack>
			<Box display="flex" justifyContent="flex-start" alignItems="center" paddingTop="5px" flexWrap="wrap">
				<Box display="flex" justifyContent="flex-start" alignItems="center">
					<Typography fontSize={12} lineHeight="17px" color={BASE_COLOR_LIGHT} noWrap>
						{formatUser(row, session?.user?.email)}
					</Typography>
					<div style={styles.divider} />
					<Typography fontSize={12} lineHeight="17px" color="primary" noWrap>
						{row.page_label}
					</Typography>
				</Box>
				<Box display="flex" justifyContent="flex-start" alignItems="center">
					<div style={styles.divider} />
					<Typography fontSize={12} lineHeight="17px" color={BASE_COLOR_LIGHT} noWrap>
						{compact
							? dayjs(row.created_at).format('MM/DD/YY hh:mm A')
							: dayjs(row.created_at).format('MMMM D, YYYY hh:mm A')}
					</Typography>
				</Box>
			</Box>
		</Stack>
	);
}

export default function UserActivityTable({
	checklistId,
	claimId,
	users,
	range,
	searchTerm,
	pageSize = 25,
	compact = false,
	showPagination = true,
}: {
	checklistId?: number;
	claimId?: number;
	users: GetUserOutput[];
	range: DateRange<Dayjs>;
	searchTerm?: string;
	pageSize?: number;
	compact?: boolean;
	showPagination?: boolean;
}) {
	const [constraints, setConstraints] = useState<GridPaginationModel>({ page: 0, pageSize });
	const trpcUtils = trpc.useUtils();
	const { data: session } = useSession();

	const filters = useMemo(
		() => ({
			checklistId,
			claimId,
			emails: users.map((u) => u.email),
			range: [range[0]?.toString() ?? null, range[1]?.toString() ?? null] as [string | null, string | null],
			searchTerm,
		}),
		[checklistId, claimId, users, range, searchTerm]
	);

	const { data: logs = { rows: [], count: undefined }, isFetching: isFetchingLogs } = useResponseTrpc().listLogs(
		{
			filters,
			limit: constraints.pageSize,
			offset: constraints.page * constraints.pageSize,
		},
		{
			enabled: checklistId !== -1 && claimId !== -1,
		}
	);
	const rowCountRef = useRef(logs.count ?? 0);

	const rowCount = useMemo(() => {
		if (logs.count !== undefined) {
			rowCountRef.current = logs.count;
		}
		return rowCountRef.current;
	}, [logs.count]);

	const columns = useMemo(() => {
		const gridColumns: GridColDef[] = [
			{
				field: 'desc',
				headerName: '',
				renderCell: (params) => <DescriptionCell compact={compact} {...params} />,
				flex: 1,
			},
		];
		return gridColumns;
	}, [compact]);

	// CSV column configuration matching table display
	const csvColumns: CsvColumn<(typeof logs.rows)[number]>[] = useMemo(
		() => [
			{
				header: 'Action',
				accessor: 'action',
				formatter: (value) => {
					switch (value) {
						case 'insert':
							return 'Insert';
						case 'update':
							return 'Update';
						case 'delete':
							return 'Delete';
						default:
							return value || '';
					}
				},
			},
			{
				header: 'Question',
				accessor: 'question_text',
			},
			{
				header: 'Page',
				accessor: 'page_label',
			},
			{
				header: 'Old Response Text',
				accessor: 'old_response_text',
				formatter: (value) => value || '',
			},
			{
				header: 'New Response Text',
				accessor: 'new_response_text',
				formatter: (value) => value || '',
			},
			{
				header: 'Old Answers',
				accessor: (row) => {
					try {
						const answers =
							typeof row.old_answers === 'string' ? JSON.parse(row.old_answers) : row.old_answers;
						if (!answers || !Array.isArray(answers)) return '';
						return answers.map((a: any) => a.label).join(', ');
					} catch {
						return '';
					}
				},
			},
			{
				header: 'New Answers',
				accessor: (row) => {
					try {
						const answers =
							typeof row.new_answers === 'string' ? JSON.parse(row.new_answers) : row.new_answers;
						if (!answers || !Array.isArray(answers)) return '';
						return answers.map((a: any) => a.label).join(', ');
					} catch {
						return '';
					}
				},
			},
			{
				header: 'User',
				accessor: (row) => formatUser(row, session?.user?.email),
			},
			{
				header: 'User Email',
				accessor: 'email',
			},
			{
				header: 'Timestamp',
				accessor: 'created_at',
				formatter: (value) => dayjs(value).format('MMMM D, YYYY hh:mm A'),
			},
		],
		[session?.user?.email]
	);

	return (
		<Box sx={{ width: '100%', height: '100%', position: 'relative' }}>
			{showPagination && !compact && (
				<Box
					sx={{
						display: 'flex',
						justifyContent: 'flex-end',
						alignItems: 'center',
						position: 'absolute',
						top: -45,
						right: 0,
						zIndex: 1,
					}}
				>
					<Typography variant="caption" fontSize={12} color="text.secondary" marginRight="20px">
						{rowCount.toLocaleString()} event{rowCount !== 1 ? 's' : ''}
					</Typography>
					<ExportButton
						onExport={async () => {
							const result = await trpcUtils.response.exportResponseAuditLogs.fetch({ filters });
							return result;
						}}
						columns={csvColumns}
						filename="user_activity"
						size="small"
					/>
				</Box>
			)}
			<DataGridPro
				columns={columns}
				columnHeaderHeight={0}
				loading={isFetchingLogs}
				slots={{
					pagination: CustomPagination,
				}}
				rows={logs.rows}
				getRowHeight={() => 'auto'}
				rowCount={rowCount}
				hideFooterSelectedRowCount
				pageSizeOptions={[]}
				getRowClassName={(params) => (params.indexRelativeToCurrentPage % 2 === 0 ? 'striped' : '')}
				hideFooter={!showPagination}
				pagination={showPagination}
				paginationMode="server"
				paginationModel={constraints}
				onPaginationModelChange={setConstraints}
				disableColumnSelector
				disableRowSelectionOnClick
				disableColumnMenu
				sx={styles.tableOverrides}
			/>
		</Box>
	);
}

const styles = {
	chip: {
		height: 20,
		marginTop: '2px',
		marginLeft: '2px',
		fontStyle: 'italic',
	},
	divider: {
		width: 5,
		height: 5,
		borderRadius: 5,
		backgroundColor: '#d9d9d9',
		margin: '0px 10px',
	},
	tableOverrides: {
		border: 'none',
		// remove the grey hover background
		'& .MuiDataGrid-row:hover': {
			backgroundColor: 'transparent !important',
		},
		// (optional) remove the hover “pointer” cursor too
		'& .MuiDataGrid-row': {
			cursor: 'default',
		},
	},
};
