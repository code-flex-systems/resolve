'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Box,
	Button,
	Chip,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	Typography,
} from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import HistoryIcon from '@mui/icons-material/History';
import dayjs from 'dayjs';
import { useWorkflowTrpc, RuleExecutionHistory } from '@/hooks/trpc/useWorkflowTrpc';
import { RuleExecutionStatus, WorkflowActionType, WorkflowTriggerType } from '@/config/enums';
import { EXECUTION_STATUS_CONFIG, formatActionType, formatTriggerType } from '@/lib/utils/workflowUtils';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { BASE_COLOR_LIGHT, dataGridFocusStyles } from '@/styles/theme';

interface ExecutionHistoryTableProps {
	ruleId?: number;
	compact?: boolean;
}

type ExecutionRow = RuleExecutionHistory['rows'][number];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No execution history"
			icon={<HistoryIcon sx={{ fontSize: 35, color: BASE_COLOR_LIGHT }} />}
		/>
	);
}

export default function ExecutionHistoryTable({ ruleId, compact = false }: ExecutionHistoryTableProps) {
	const [allRows, setAllRows] = useState<ExecutionRow[]>([]);
	const [cursor, setCursor] = useState<{ createdAt: string; id: number } | undefined>();
	const [statusFilter, setStatusFilter] = useState<RuleExecutionStatus | ''>('');
	const [detailRow, setDetailRow] = useState<ExecutionRow | null>(null);

	const { data, isLoading, isFetching } = useWorkflowTrpc().listExecutionHistory(
		{
			...(ruleId != null ? { ruleId } : {}),
			...(statusFilter ? { status: statusFilter } : {}),
			limit: 25,
			cursor,
		},
		{
			placeholderData: (prev) => prev,
		}
	);

	// Append new rows when data arrives
	useEffect(() => {
		if (data?.rows) {
			if (cursor) {
				// Appending next page
				setAllRows((prev) => {
					const existingIds = new Set(prev.map((r) => r.id));
					const newRows = data.rows.filter((r) => !existingIds.has(r.id));
					return [...prev, ...newRows];
				});
			} else {
				// Fresh load (no cursor = first page)
				setAllRows(data.rows);
			}
		}
	}, [data, cursor]);

	// Reset when ruleId prop changes
	useEffect(() => {
		setAllRows([]);
		setCursor(undefined);
	}, [ruleId]);

	// Reset when filter changes
	const handleStatusFilterChange = useCallback((value: RuleExecutionStatus | '') => {
		setStatusFilter(value);
		setAllRows([]);
		setCursor(undefined);
	}, []);

	const handleLoadMore = useCallback(() => {
		if (data?.nextCursor) {
			setCursor(data.nextCursor);
		}
	}, [data?.nextCursor]);

	const columns: GridColDef[] = useMemo(() => {
		const cols: GridColDef[] = [];

		if (!compact) {
			cols.push({
				field: 'rule_name',
				headerName: 'Rule Name',
				flex: 1,
				minWidth: 180,
			});
		}

		cols.push(
			{
				field: 'claim_number',
				headerName: 'Claim',
				width: 140,
				renderCell: (params: GridRenderCellParams) => {
					return (
						<Typography variant="body2">
							{params.row.claim_number || `#${params.row.claim_id}`}
						</Typography>
					);
				},
			},
			{
				field: 'action_type',
				headerName: 'Action Type',
				width: 160,
				renderCell: (params: GridRenderCellParams) => {
					const actionType = params.value as WorkflowActionType;
					if (!actionType) return '-';
					return <Chip label={formatActionType(actionType)} size="small" variant="outlined" />;
				},
			},
			{
				field: 'status',
				headerName: 'Status',
				width: 120,
				renderCell: (params: GridRenderCellParams) => {
					const status = params.value as RuleExecutionStatus;
					const config = EXECUTION_STATUS_CONFIG[status];
					if (!config) return params.value || '-';
					return <Chip label={config.label} color={config.color} size="small" />;
				},
			},
			{
				field: 'trigger_type',
				headerName: 'Trigger Type',
				width: 140,
				renderCell: (params: GridRenderCellParams) => {
					const triggerType = params.value as WorkflowTriggerType;
					if (!triggerType) return '-';
					return <Typography variant="body2">{formatTriggerType(triggerType)}</Typography>;
				},
			},
			{
				field: 'created_at',
				headerName: 'Created At',
				width: 170,
				renderCell: (params: GridRenderCellParams) => {
					if (!params.value) return '-';
					return (
						<Typography variant="body2">
							{dayjs(params.value).format('MMM D, YYYY h:mm A')}
						</Typography>
					);
				},
			},
			{
				field: 'executed_at',
				headerName: 'Executed At',
				width: 170,
				renderCell: (params: GridRenderCellParams) => {
					if (!params.value) {
						return (
							<Typography variant="body2" color="text.secondary">
								&mdash;
							</Typography>
						);
					}
					return (
						<Typography variant="body2">
							{dayjs(params.value).format('MMM D, YYYY h:mm A')}
						</Typography>
					);
				},
			}
		);

		return cols;
	}, [compact]);

	return (
		<Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			{/* Filter toolbar (full mode only) */}
			{!compact && (
				<Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
					<FormControl size="small" sx={{ minWidth: 160 }}>
						<InputLabel>Status</InputLabel>
						<Select
							value={statusFilter}
							label="Status"
							onChange={(e) =>
								handleStatusFilterChange(e.target.value as RuleExecutionStatus | '')
							}
						>
							<MenuItem value="">All</MenuItem>
							<MenuItem value={RuleExecutionStatus.PENDING}>Pending</MenuItem>
							<MenuItem value={RuleExecutionStatus.EXECUTED}>Executed</MenuItem>
							<MenuItem value={RuleExecutionStatus.FAILED}>Failed</MenuItem>
							<MenuItem value={RuleExecutionStatus.SKIPPED}>Skipped</MenuItem>
						</Select>
					</FormControl>
				</Stack>
			)}

			{/* DataGrid */}
			<Box sx={{ flex: 1, minHeight: 400 }}>
				<DataGridPro
					rows={allRows}
					columns={columns}
					loading={isLoading}
					disableColumnMenu
					disableRowSelectionOnClick
					onRowClick={(params) => setDetailRow(params.row as ExecutionRow)}
					pageSizeOptions={[25, 50, 100]}
					initialState={{
						pagination: { paginationModel: { pageSize: 25 } },
					}}
					slots={{
						noRowsOverlay: NoRows,
						noResultsOverlay: NoRows,
					}}
					slotProps={{
						loadingOverlay: {
							noRowsVariant: 'linear-progress',
							variant: 'linear-progress',
						},
					}}
					sx={{
						height: '100%',
						border: 'none',
						'& .MuiDataGrid-cell': {
							py: 1,
							display: 'flex',
							alignItems: 'center',
							cursor: 'pointer',
						},
						'& .MuiDataGrid-columnSeparator': {
							display: 'none',
						},
						...dataGridFocusStyles,
					}}
				/>
			</Box>

			{/* Load More button */}
			{data?.hasNextPage && (
				<Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
					<Button
						variant="outlined"
						size="small"
						onClick={handleLoadMore}
						disabled={isFetching}
					>
						{isFetching ? 'Loading...' : 'Load More'}
					</Button>
				</Box>
			)}

			{/* Detail Dialog */}
			{detailRow && (
				<Dialog open onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
					<DialogTitle>Execution Detail</DialogTitle>
					<DialogContent>
						<Stack spacing={2} sx={{ mt: 1 }}>
							<Box>
								<Typography variant="caption" color="text.secondary">
									Status
								</Typography>
								<Box sx={{ mt: 0.5 }}>
									<Chip
										label={EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.label || detailRow.status}
										color={EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.color || 'default'}
										size="small"
									/>
								</Box>
							</Box>

							{detailRow.error_message && (
								<Box>
									<Typography variant="caption" color="text.secondary">
										Error Message
									</Typography>
									<Typography
										variant="body2"
										color="error.main"
										sx={{
											mt: 0.5,
											p: 1.5,
											bgcolor: '#fef2f2',
											borderRadius: 1,
											fontFamily: 'monospace',
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word',
										}}
									>
										{detailRow.error_message}
									</Typography>
								</Box>
							)}

							{detailRow.result_data && (
								<Box>
									<Typography variant="caption" color="text.secondary">
										Result Data
									</Typography>
									<Box
										sx={{
											mt: 0.5,
											p: 1.5,
											bgcolor: 'grey.50',
											borderRadius: 1,
											overflow: 'auto',
											maxHeight: 300,
										}}
									>
										<pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
											{typeof detailRow.result_data === 'string'
												? detailRow.result_data
												: JSON.stringify(detailRow.result_data, null, 2)}
										</pre>
									</Box>
								</Box>
							)}
						</Stack>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDetailRow(null)}>Close</Button>
					</DialogActions>
				</Dialog>
			)}
		</Box>
	);
}
