'use client';

import { useState } from 'react';
import {
	Box,
	Typography,
	Chip,
	Skeleton,
	Paper,
	IconButton,
	Button,
	Tooltip,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import { containerStyles, TEXT_PRIMARY, TEXT_SECONDARY } from '@/styles/theme';
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
			variant="rounded"
			height={80}
			sx={{ borderRadius: '8px' }}
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
			<Box sx={{ ...containerStyles.beveledCard, p: 3 }}>
				<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
					<Typography variant="h6" sx={{ fontWeight: 600, color: TEXT_PRIMARY }}>
						Pending Approvals
					</Typography>
					<Skeleton variant="rounded" width={40} height={24} />
				</Box>
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
					<CardSkeleton />
					<CardSkeleton />
				</Box>
			</Box>
		);
	}

	return (
		<Box sx={{ ...containerStyles.beveledCard, p: 3 }}>
			{/* Header */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
				<Typography variant="h6" sx={{ fontWeight: 600, color: TEXT_PRIMARY }}>
					Pending Approvals
				</Typography>
				<Chip
					label={totalCount}
					size="small"
					color="info"
					sx={{ fontWeight: 600, minWidth: 28 }}
				/>
			</Box>

			{/* Content */}
			{rows.length === 0 ? (
				/* Empty state */
				<Box
					sx={{
						display: 'flex',
						flexDirection: 'column',
						alignItems: 'center',
						justifyContent: 'center',
						py: 5,
						gap: 1.5,
					}}
				>
					<HourglassEmptyIcon sx={{ fontSize: 40, color: '#94a3b8' }} />
					<Typography sx={{ fontSize: 14, color: TEXT_SECONDARY }}>
						No pending executions
					</Typography>
				</Box>
			) : (
				<Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
					{rows.map((execution: PendingExecution) => (
						<Paper
							key={execution.id}
							variant="outlined"
							sx={{
								p: 2,
								display: 'flex',
								alignItems: 'center',
								justifyContent: 'space-between',
								gap: 2,
								opacity: isFetching ? 0.6 : 1,
								transition: 'opacity 0.2s',
							}}
						>
							{/* Left side: info */}
							<Box sx={{ flex: 1, minWidth: 0 }}>
								<Typography
									sx={{
										fontSize: 14,
										fontWeight: 600,
										color: TEXT_PRIMARY,
										whiteSpace: 'nowrap',
										overflow: 'hidden',
										textOverflow: 'ellipsis',
									}}
								>
									{execution.rule_name}
								</Typography>
								<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
									<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY }}>
										Claim {execution.claim_number}
									</Typography>
									<Typography sx={{ fontSize: 12, color: '#94a3b8' }}>
										{formatRelativeTime(execution.created_at)}
									</Typography>
								</Box>
							</Box>

							{/* Chips */}
							<Box sx={{ display: 'flex', gap: 0.75, flexShrink: 0 }}>
								<Chip
									label={formatActionType(execution.action_type as WorkflowActionType)}
									size="small"
									sx={{
										fontSize: 11,
										fontWeight: 500,
										backgroundColor: '#e0f2fe',
										color: '#075985',
									}}
								/>
								<Chip
									label={formatTriggerType(execution.trigger_type as WorkflowTriggerType)}
									size="small"
									sx={{
										fontSize: 11,
										fontWeight: 500,
										backgroundColor: '#f1f5f9',
										color: '#475569',
									}}
								/>
							</Box>

							{/* Action buttons */}
							<Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
								<Tooltip title="Approve">
									<span>
										<IconButton
											size="small"
											disabled={isMutating}
											onClick={() => handleApprove(execution.id)}
											sx={{ color: '#16a34a' }}
										>
											<CheckCircleIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
								<Tooltip title="Reject">
									<span>
										<IconButton
											size="small"
											disabled={isMutating}
											onClick={() => handleReject(execution.id)}
											sx={{ color: '#dc2626' }}
										>
											<CancelIcon fontSize="small" />
										</IconButton>
									</span>
								</Tooltip>
							</Box>
						</Paper>
					))}
				</Box>
			)}

			{/* Pagination */}
			{totalCount > PAGE_SIZE && (
				<Box
					sx={{
						display: 'flex',
						alignItems: 'center',
						justifyContent: 'center',
						gap: 2,
						mt: 2,
					}}
				>
					<Button
						size="small"
						disabled={offset === 0 || isMutating}
						onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
						sx={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
					>
						Previous
					</Button>
					<Typography sx={{ fontSize: 13, color: TEXT_SECONDARY }}>
						Page {currentPage} of {totalPages}
					</Typography>
					<Button
						size="small"
						disabled={currentPage >= totalPages || isMutating}
						onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
						sx={{ textTransform: 'none', fontWeight: 500, fontSize: 13 }}
					>
						Next
					</Button>
				</Box>
			)}
		</Box>
	);
}
