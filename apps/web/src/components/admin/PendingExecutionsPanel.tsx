'use client';

import { IconCircleCheck, IconCircleX, IconHourglass } from '@tabler/icons-react';
import Tooltip from '@/components/ui/Tooltip';
import Card from '@/components/ui/Card';
import Skeleton from '@/components/ui/Skeleton';
import Chip from '@/components/ui/Chip';
import Button from '@/components/ui/Button';
import { useState } from 'react';
import { containerStyles } from '@/styles/theme';
import { useWorkflowTrpc, PendingExecutionList } from '@/hooks/trpc/useWorkflowTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import { formatActionType, formatTriggerType } from '@/lib/utils/workflowUtils';
import { WorkflowActionType, WorkflowTriggerType } from '@/config/enums';

const PAGE_SIZE = 5;

type PendingExecution = PendingExecutionList['rows'][number];

function formatRelativeTime(dateStr: string | Date): string {
	const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffDays > 0) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
	if (diffHours > 0) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
	if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
	return 'just now';
}

function CardSkeleton() {
	return (
		<Skeleton
			variant="rect"
			height={80}
			className="rounded-lg"
		/>
	);
}

/**
 * PendingExecutionsPanel - Displays pending workflow rule executions awaiting admin approval.
 * Self-contained component that fetches its own data with offset-based pagination.
 */
export default function PendingExecutionsPanel() {
	const [offset, setOffset] = useState(0);
	const showAlert = useAlertStore((state) => state.showAlert);

	const { listPendingExecutions, approvePendingExecution, rejectPendingExecution } =
		useWorkflowTrpc();

	const { data, isLoading, isFetching } = listPendingExecutions(
		{ limit: PAGE_SIZE, offset }
	);

	const rows = data?.rows ?? [];
	const totalCount = data?.count ?? 0;
	const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
	const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

	const isMutating = approvePendingExecution.isPending || rejectPendingExecution.isPending;

	const handleApprove = (executionId: number) => {
		approvePendingExecution.mutate(
			{ executionId },
			{
				onSuccess: () => showAlert('Execution approved', 'success'),
				onError: (err) => showAlert(err.message, 'error'),
			}
		);
	};

	const handleReject = (executionId: number) => {
		rejectPendingExecution.mutate(
			{ executionId },
			{
				onSuccess: () => showAlert('Execution rejected', 'success'),
				onError: (err) => showAlert(err.message, 'error'),
			}
		);
	};

	// Loading state for initial load
	if (isLoading) {
		return (
			<div style={{ ...containerStyles.beveledCard, padding: 24 }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
					<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
						Pending Approvals
					</span>
					<Skeleton variant="rect" width={40} height={24} />
				</div>
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					<CardSkeleton />
					<CardSkeleton />
				</div>
			</div>
		);
	}

	return (
		<div style={{ ...containerStyles.beveledCard, padding: 24 }}>
			{/* Header */}
			<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
				<span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
					Pending Approvals
				</span>
				<Chip 
					size="sm"
					color="info"
					style={{ fontWeight: 600, minWidth: 28 }}>{totalCount}</Chip>
			</div>

			{/* Content */}
			{rows.length === 0 ? (
				/* Empty state */
				<div
					style={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						paddingBlock: 40,
						gap: 12,
					}}
				>
					<IconHourglass size={40} style={{ color: '#94a3b8' }} />
					<span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
						No pending executions
					</span>
				</div>
			) : (
				<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
					{rows.map((execution: PendingExecution) => (
						<div
							key={execution.id}
							style={{
								padding: 16,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: 16,
								opacity: isFetching ? 0.6 : 1,
								transition: 'opacity 0.2s',
							}}
						>
							{/* Left side: info */}
							<div style={{ flex: 1, minWidth: 0 }}>
								<span
									style={{
										fontSize: 14,
										fontWeight: 600,
										color: 'var(--text-primary)',
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{execution.rule_name}
								</span>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
									<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
										Claim {execution.claim_number}
									</span>
									<span style={{ fontSize: 12, color: '#94a3b8' }}>
										{formatRelativeTime(execution.created_at)}
									</span>
								</div>
							</div>

							{/* Chips */}
							<div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
								<Chip 
									size="sm"
									style={{
										fontSize: 11,
										fontWeight: 500,
										backgroundColor: '#e0f2fe',
										color: '#075985',
									}}>{formatActionType(execution.action_type as WorkflowActionType)}</Chip>
								<Chip 
									size="sm"
									style={{
										fontSize: 11,
										fontWeight: 500,
										backgroundColor: '#f1f5f9',
										color: '#475569',
									}}>{formatTriggerType(execution.trigger_type as WorkflowTriggerType)}</Chip>
							</div>

							{/* Action buttons */}
							<div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
								<Tooltip content="Approve">
									<span>
										<Button variant="icon" size="sm"
											disabled={isMutating}
											onClick={() => handleApprove(execution.id)}
											style={{ color: '#16a34a' }}
										>
											<IconCircleCheck size={20} />
										</Button>
									</span>
								</Tooltip>
								<Tooltip content="Reject">
									<span>
										<Button variant="icon" size="sm"
											disabled={isMutating}
											onClick={() => handleReject(execution.id)}
											style={{ color: '#dc2626' }}
										>
											<IconCircleX size={20} />
										</Button>
									</span>
								</Tooltip>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{totalCount > PAGE_SIZE && (
				<div
					style={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 16,
						marginTop: 16,
					}}
				>
					<Button
						size="sm"
						disabled={offset === 0 || isMutating}
						onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
						style={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
					>
						Previous
					</Button>
					<span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
						Page {currentPage} of {totalPages}
					</span>
					<Button
						size="sm"
						disabled={currentPage >= totalPages || isMutating}
						onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
						style={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
					>
						Next
					</Button>
				</div>
			)}
		</div>
	);
}
