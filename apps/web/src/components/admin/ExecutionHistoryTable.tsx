'use client';

import { IconHistory } from '@tabler/icons-react';
import Dialog from '@/components/ui/Dialog';
import Dropdown from '@/components/ui/Dropdown';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useWorkflowTrpc, RuleExecutionHistory } from '@/hooks/trpc/useWorkflowTrpc';
import { RuleExecutionStatus, WorkflowActionType, WorkflowTriggerType } from '@/config/enums';
import { EXECUTION_STATUS_CONFIG, formatActionType, formatTriggerType } from '@/lib/utils/workflowUtils';
import CustomNoRowsOverlay from '../common/CustomNoRowsOverlay';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface ExecutionHistoryTableProps {
	ruleId?: string;
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
	const [cursor, setCursor] = useState<{ createdAt: string; id: string } | undefined>();
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

	const columns: ColumnDef<any, any>[] = useMemo(() => {
		const cols: ColumnDef<any, any>[] = [];

		if (!compact) {
			cols.push({
				accessorKey: 'rule_name',
				header: 'Rule Name',
				minSize: 180,
			});
		}

		cols.push(
			{
				accessorKey: 'claim_number',
				header: 'Claim',
				size: 140,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					return <span>{params.row.claim_number || `#${params.row.claim_id}`}</span>;
				},
			},
			{
				accessorKey: 'action_type',
				header: 'Action Type',
				size: 160,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const actionType = params.value as WorkflowActionType;
					if (!actionType) return '-';
					return (
						<Chip size="sm" variant="outlined">
							{formatActionType(actionType)}
						</Chip>
					);
				},
			},
			{
				accessorKey: 'status',
				header: 'Status',
				size: 120,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const status = params.value as RuleExecutionStatus;
					const config = EXECUTION_STATUS_CONFIG[status];
					if (!config) return params.value || '-';
					return (
						<Chip color={config.color} size="sm">
							{config.label}
						</Chip>
					);
				},
			},
			{
				accessorKey: 'trigger_type',
				header: 'Trigger Type',
				size: 140,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const triggerType = params.value as WorkflowTriggerType;
					if (!triggerType) return '-';
					return <span>{formatTriggerType(triggerType)}</span>;
				},
			},
			{
				accessorKey: 'created_at',
				header: 'Created At',
				size: 170,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					if (!params.value) return '-';
					return <span>{dayjs(params.value).format('MMM D, YYYY h:mm A')}</span>;
				},
			},
			{
				accessorKey: 'executed_at',
				header: 'Executed At',
				size: 170,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					if (!params.value) {
						return <span style={{ color: 'var(--text-secondary)' }}>&mdash;</span>;
					}
					return <span>{dayjs(params.value).format('MMM D, YYYY h:mm A')}</span>;
				},
			}
		);

		return cols;
	}, [compact]);

	return (
		<div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
			{/* Filter toolbar (full mode only) */}
			{!compact && (
				<div
					style={{
						display: 'flex',
						justifyContent: 'space-between',
						gap: 16,
						alignItems: 'center',
						marginBottom: 16,
					}}
				>
					<p style={{ color: 'var(--text-secondary)', fontSize: 13, margin: '0 0 12px', lineHeight: 1.5 }}>
						View the history of all workflow rule executions, including actions taken, pending approvals,
						and failures.
					</p>
					<div style={{ minWidth: 160 }}>
						<Dropdown
							label="Status"
							options={[
								{ value: '', label: 'All' },
								{ value: RuleExecutionStatus.PENDING, label: 'Pending' },
								{ value: RuleExecutionStatus.EXECUTED, label: 'Executed' },
								{ value: RuleExecutionStatus.FAILED, label: 'Failed' },
								{ value: RuleExecutionStatus.SKIPPED, label: 'Skipped' },
							]}
							value={statusFilter}
							onChange={(v) => handleStatusFilterChange(String(v) as RuleExecutionStatus | '')}
						/>
					</div>
				</div>
			)}

			{/* DataGrid */}
			<div style={{ flex: 1, minHeight: 400 }}>
				<DataTable rows={allRows} columns={columns} loading={isLoading} onRowClick={setDetailRow} />
			</div>

			{/* Load More button */}
			{data?.hasNextPage && (
				<div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
					<Button variant="outlined" size="sm" onClick={handleLoadMore} disabled={isFetching}>
						{isFetching ? 'Loading...' : 'Load More'}
					</Button>
				</div>
			)}

			{/* Detail Dialog */}
			<Dialog
				open={!!detailRow}
				onClose={() => setDetailRow(null)}
				title="Execution Detail"
				size="sm"
				footer={
					<div style={{ display: 'flex', justifyContent: 'flex-end' }}>
						<Button onClick={() => setDetailRow(null)}>Close</Button>
					</div>
				}
			>
				{detailRow && (
					<div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 8 }}>
						<div>
							<span style={{ color: 'var(--text-secondary)' }}>Status</span>
							<div style={{ marginTop: 4 }}>
								<Chip
									color={
										EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.color ||
										'default'
									}
									size="sm"
								>
									{EXECUTION_STATUS_CONFIG[detailRow.status as RuleExecutionStatus]?.label ||
										detailRow.status}
								</Chip>
							</div>
						</div>

						{detailRow.error_message && (
							<div>
								<span style={{ color: 'var(--text-secondary)' }}>Error Message</span>
								<span
									style={{
										color: 'var(--status-error)',
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
								<span style={{ color: 'var(--text-secondary)' }}>Result Data</span>
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
									<pre
										style={{
											margin: 0,
											fontSize: 12,
											whiteSpace: 'pre-wrap',
											wordBreak: 'break-word',
										}}
									>
										{typeof detailRow.result_data === 'string'
											? detailRow.result_data
											: JSON.stringify(detailRow.result_data, null, 2)}
									</pre>
								</div>
							</div>
						)}
					</div>
				)}
			</Dialog>
		</div>
	);
}
