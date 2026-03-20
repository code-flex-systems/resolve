'use client';

import { IconHistory } from '@tabler/icons-react';
import { Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import dayjs from 'dayjs';
import { useWorkflowTrpc, RuleExecutionHistory } from '@/hooks/trpc/useWorkflowTrpc';
import { RuleExecutionStatus, WorkflowActionType, WorkflowTriggerType } from '@/config/enums';
import { EXECUTION_STATUS_CONFIG, formatActionType, formatTriggerType } from '@/lib/utils/workflowUtils';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import { dataGridFocusStyles } from '@/styles/theme';

interface ExecutionHistoryTableProps {
	ruleId?: number;
	compact?: boolean;
}

type ExecutionRow = RuleExecutionHistory['rows'][number];

function NoRows() {
	return (
		<CustomNoRowsOverlay
			text="No execution history"
			icon={<IconHistory size={35} style={{ color: 'var(--text-muted)' }} />}
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
						<span>
							{params.row.claim_number || `#${params.row.claim_id}`}
						</span>
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
					return <Chip  size="sm" variant="outlined">{formatActionType(actionType)}</Chip>;
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
					return <Chip  color={config.color} size="sm">{config.label}</Chip>;
				},
			},
			{
				field: 'trigger_type',
				headerName: 'Trigger Type',
				width: 140,
				renderCell: (params: GridRenderCellParams) => {
					const triggerType = params.value as WorkflowTriggerType;
					if (!triggerType) return '-';
					return <span>{formatTriggerType(triggerType)}</span>;
				},
			},
			{
				field: 'created_at',
				headerName: 'Created At',
				width: 170,
				renderCell: (params: GridRenderCellParams) => {
					if (!params.value) return '-';
					return (
						<span>
							{dayjs(params.value).format('MMM D, YYYY h:mm A')}
						</span>
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
							<span style={{ color: 'var(--text-secondary)' }}>
								&mdash;
							</span>
						);
					}
					return (
						<span>
							{dayjs(params.value).format('MMM D, YYYY h:mm A')}
						</span>
					);
				},
			}
		);

		return cols;
	}, [compact]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			{/* Filter toolbar (full mode only) */}
			{!compact && (
				<div style={{ flexDirection: 'column', display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
					<FormControl size="small" style={{ minWidth: 160 }}>
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
				</div>
			)}

			{/* DataGrid */}
			<div style={{ flex: 1, minHeight: 400 }}>
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
					style={{
						height: '100%',
						border: 'none',
						...dataGridFocusStyles,
					}}
				/>
			</div>

			{/* Load More button */}
			{data?.hasNextPage && (
				<div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
					<Button
						variant="outlined"
						size="sm"
						onClick={handleLoadMore}
						disabled={isFetching}
					>
						{isFetching ? 'Loading...' : 'Load More'}
					</Button>
				</div>
			)}

			{/* Detail Dialog */}
			{detailRow && (
				<Dialog open onClose={() => setDetailRow(null)} maxWidth="sm" fullWidth>
					<DialogTitle>Execution Detail</DialogTitle>
					<DialogContent>
						<div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
							<div>
								<span style={{ color: 'var(--text-secondary)' }}>
									Status
								</span>
								<div style={{ marginTop: 4 }}>
									<Chip 
										color={EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.color || 'default'}
										size="sm">{EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.label || detailRow.status}</Chip>
								</div>
							</div>

							{detailRow.error_message && (
								<div>
									<span style={{ color: 'var(--text-secondary)' }}>
										Error Message
									</span>
									<span
										style={{  color: 'var(--status-error)' , 
											marginTop: 4,
											padding: 12,
											backgroundColor: '#fef2f2',
											borderRadius: 4,
											fontFamily: 'monospace',
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word',
										 }}
									>
										{detailRow.error_message}
									</span>
								</div>
							)}

							{detailRow.result_data && (
								<div>
									<span style={{ color: 'var(--text-secondary)' }}>
										Result Data
									</span>
									<div
										style={{
											marginTop: 4,
											padding: 12,
											backgroundColor: 'grey.50',
											borderRadius: 4,
											overflow: 'auto',
											maxHeight: 300,
										}}
									>
										<pre style={{ margin: 0, fontSize: 12, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
											{typeof detailRow.result_data === 'string'
												? detailRow.result_data
												: JSON.stringify(detailRow.result_data, null, 2)}
										</pre>
									</div>
								</div>
							)}
						</div>
					</DialogContent>
					<DialogActions>
						<Button onClick={() => setDetailRow(null)}>Close</Button>
					</DialogActions>
				</Dialog>
			)}
		</div>
	);
}
