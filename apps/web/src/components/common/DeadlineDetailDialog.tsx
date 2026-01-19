'use client';

import { useState } from 'react';
import { Box, Button, Chip, CircularProgress, Divider, Stack, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import Person from '@mui/icons-material/Person';
import Assignment from '@mui/icons-material/Assignment';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import BasicDialog from './BasicDialog';
import TaskCompletionDialog from './TaskCompletionDialog';
import TaskCancellationDialog from './TaskCancellationDialog';
import { Deadline } from '@/hooks/trpc/useDeadlineTrpc';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { DeadlineEntityType, DeadlineStatus, TaskStatus, TaskType } from '@/config/enums';
import { containerStyles, BASE_COLOR_LIGHT } from '@/styles/theme';
import { formatDeadlineType } from './DeadlineListItem';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import useIsAdmin from '@/hooks/useIsAdmin';
import { useAlertStore } from '@/stores/useAlertStore';
import { useClerkSession } from '@/lib/auth/use-clerk-session';

interface DeadlineDetailDialogProps {
	deadline: Deadline;
	onClose: () => void;
}

const STATUS_COLORS: Record<DeadlineStatus, 'default' | 'primary' | 'success' | 'error' | 'warning'> = {
	[DeadlineStatus.PENDING]: 'default',
	[DeadlineStatus.MET]: 'success',
	[DeadlineStatus.MISSED]: 'error',
	[DeadlineStatus.CANCELLED]: 'warning',
};

const STATUS_LABELS: Record<DeadlineStatus, string> = {
	[DeadlineStatus.PENDING]: 'Pending',
	[DeadlineStatus.MET]: 'Met',
	[DeadlineStatus.MISSED]: 'Missed',
	[DeadlineStatus.CANCELLED]: 'Cancelled',
};

const TASK_STATUS_COLORS: Record<TaskStatus, 'default' | 'primary' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'default',
	[TaskStatus.IN_PROGRESS]: 'primary',
	[TaskStatus.COMPLETED]: 'success',
	[TaskStatus.CANCELLED]: 'error',
};

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
	[TaskStatus.PENDING]: 'Pending',
	[TaskStatus.IN_PROGRESS]: 'In Progress',
	[TaskStatus.COMPLETED]: 'Completed',
	[TaskStatus.CANCELLED]: 'Cancelled',
};

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
	return (
		<Box display="flex" justifyContent="space-between" alignItems="flex-start" py={0.75}>
			<Typography fontSize={13} color="text.secondary" sx={{ minWidth: 120 }}>
				{label}
			</Typography>
			<Box textAlign="right" flex={1}>
				{typeof value === 'string' ? (
					<Typography fontSize={13}>{value}</Typography>
				) : (
					value
				)}
			</Box>
		</Box>
	);
}

function ClaimLink({ claimId, claimNumber }: { claimId: number; claimNumber: string | null }) {
	const router = useRouter();

	return (
		<Typography
			fontSize={13}
			color="primary.main"
			sx={{
				cursor: 'pointer',
				'&:hover': {
					textDecoration: 'underline',
				},
			}}
			onClick={() => router.push(`/claims/${claimId}`)}
		>
			{claimNumber || `Claim #${claimId}`}
		</Typography>
	);
}

export default function DeadlineDetailDialog({ deadline, onClose }: DeadlineDetailDialogProps) {
	const { data: session } = useClerkSession();
	const isAdmin = useIsAdmin();
	const showAlert = useAlertStore((state) => state.showAlert);
	const [showCompletionDialog, setShowCompletionDialog] = useState(false);
	const [showCancellationDialog, setShowCancellationDialog] = useState(false);

	const isTaskDeadline = deadline.entity_type === DeadlineEntityType.TASK;
	const taskId = isTaskDeadline ? deadline.entity_id : null;

	// Fetch task details if this deadline is linked to a task
	const { data: task, isLoading: taskLoading } = useTaskTrpc().get(
		{ id: taskId! },
		{ enabled: !!taskId }
	);

	const { mutateAsync: claimTask, isPending: isClaiming } = useTaskTrpc().claim;
	const { mutateAsync: unclaimTask, isPending: isUnclaiming } = useTaskTrpc().unclaim;

	const isOverdue = dayjs(deadline.deadline_date).isBefore(dayjs());
	const isPendingDeadline = deadline.status === DeadlineStatus.PENDING;

	// Determine task status and user permissions for actions
	const isTaskPending = task?.status === TaskStatus.PENDING;
	const isTaskInProgress = task?.status === TaskStatus.IN_PROGRESS;
	const isUserClaimedBy = task?.claimed_by === session?.user?.id;

	// Action availability
	const canStartTask = task && isTaskPending;
	const canReleaseTask = task && isTaskInProgress && isUserClaimedBy;
	const canCompleteTask = task && isTaskInProgress && (isAdmin || isUserClaimedBy);
	const canCancelTask = task && (isTaskPending || isTaskInProgress) && isAdmin;

	const handleStartTask = async () => {
		if (!task) return;
		try {
			await claimTask({ id: task.id });
			showAlert('Task started - you can now work on it', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to start task', 'error');
		}
	};

	const handleReleaseTask = async () => {
		if (!task) return;
		try {
			await unclaimTask({ id: task.id });
			showAlert('Task released back to queue', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to release task', 'error');
		}
	};

	const handleTaskCompleted = () => {
		setShowCompletionDialog(false);
		onClose();
	};

	const handleTaskCancelled = () => {
		setShowCancellationDialog(false);
		onClose();
	};

	// Loading state for task deadlines
	if (isTaskDeadline && taskLoading) {
		return (
			<BasicDialog
				title="Task Details"
				secondaryActions={[{ label: 'Close', onClick: onClose }]}
				onClose={onClose}
				width={480}
			>
				<Box display="flex" justifyContent="center" py={4}>
					<CircularProgress size={32} />
				</Box>
			</BasicDialog>
		);
	}

	// Task view (when deadline has associated task)
	if (isTaskDeadline && task) {
		return (
			<>
				<BasicDialog
					title="Task Details"
					secondaryActions={[{ label: 'Close', onClick: onClose }]}
					onClose={onClose}
					width={480}
				>
					<Box sx={containerStyles.section}>
						<Typography sx={containerStyles.sectionTitle}>
							<Assignment sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
							{task.title}
						</Typography>
						<Box sx={containerStyles.sectionContent}>
							<DetailRow
								label="Type"
								value={
									<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
										{TASK_TYPE_CONFIG[task.task_type as TaskType]?.icon}
										<Typography fontSize={13}>
											{TASK_TYPE_CONFIG[task.task_type as TaskType]?.label || task.task_type}
										</Typography>
									</Stack>
								}
							/>
							<DetailRow
								label="Status"
								value={
									<Chip
										label={TASK_STATUS_LABELS[task.status as TaskStatus]}
										color={TASK_STATUS_COLORS[task.status as TaskStatus]}
										size="small"
									/>
								}
							/>
							<DetailRow
								label="Due Date"
								value={
									<Typography
										fontSize={13}
										color={isOverdue && isPendingDeadline ? 'error.main' : 'inherit'}
										fontWeight={isOverdue && isPendingDeadline ? 600 : 400}
									>
										{dayjs(deadline.deadline_date).format('MMM D, YYYY')}
										{isOverdue && isPendingDeadline && ' (Overdue)'}
									</Typography>
								}
							/>
							{task.description && (
								<DetailRow label="Description" value={task.description} />
							)}
							{task.claimed_by_first && task.claimed_by_last && (
								<DetailRow
									label="Assigned To"
									value={
										<Stack direction="row" spacing={0.5} alignItems="center" justifyContent="flex-end">
											<Person sx={{ fontSize: 14, color: BASE_COLOR_LIGHT }} />
											<Typography fontSize={13}>
												{task.claimed_by_first} {task.claimed_by_last}
											</Typography>
										</Stack>
									}
								/>
							)}
							<DetailRow
								label="Claim"
								value={<ClaimLink claimId={deadline.claim_id} claimNumber={deadline.claim_number} />}
							/>
							{task.completion_notes && (
								<DetailRow label="Completion Notes" value={task.completion_notes} />
							)}

							{/* Task Actions */}
							{(canStartTask || canReleaseTask || canCompleteTask || canCancelTask) && (
								<>
									<Divider sx={{ my: 1.5 }} />
									<Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
										{canStartTask && (
											<Button
												size="small"
												variant="outlined"
												color="primary"
												startIcon={<PlayArrow />}
												onClick={handleStartTask}
												disabled={isClaiming}
											>
												Start Task
											</Button>
										)}
										{canReleaseTask && (
											<Button
												size="small"
												variant="outlined"
												color="warning"
												startIcon={<Stop />}
												onClick={handleReleaseTask}
												disabled={isUnclaiming}
											>
												Release Task
											</Button>
										)}
										{canCancelTask && (
											<Button
												size="small"
												variant="outlined"
												color="error"
												startIcon={<Cancel />}
												onClick={() => setShowCancellationDialog(true)}
											>
												Cancel Task
											</Button>
										)}
										{canCompleteTask && (
											<Button
												size="small"
												variant="contained"
												color="success"
												startIcon={<CheckCircle />}
												onClick={() => setShowCompletionDialog(true)}
											>
												Complete Task
											</Button>
										)}
									</Stack>
								</>
							)}
						</Box>
					</Box>
				</BasicDialog>

				{/* Task Completion Dialog */}
				{showCompletionDialog && (
					<TaskCompletionDialog
						task={task}
						onClose={() => setShowCompletionDialog(false)}
						onCompleted={handleTaskCompleted}
					/>
				)}

				{/* Task Cancellation Dialog */}
				{showCancellationDialog && (
					<TaskCancellationDialog
						task={task}
						onClose={() => setShowCancellationDialog(false)}
						onCancelled={handleTaskCancelled}
					/>
				)}
			</>
		);
	}

	// Deadline view (standalone deadline or task not found)
	return (
		<BasicDialog
			title="Deadline Details"
			secondaryActions={[{ label: 'Close', onClick: onClose }]}
			onClose={onClose}
			width={480}
		>
			<Box sx={containerStyles.section}>
				<Typography sx={containerStyles.sectionTitle}>
					<CalendarTodayIcon sx={{ fontSize: 16, mr: 1, verticalAlign: 'text-bottom' }} />
					{formatDeadlineType(deadline.deadline_type)}
				</Typography>
				<Box sx={containerStyles.sectionContent}>
					<DetailRow
						label="Due Date"
						value={
							<Typography fontSize={13}>
								{dayjs(deadline.deadline_date).format('MMM D, YYYY')}
							</Typography>
						}
					/>
					<DetailRow
						label="Status"
						value={
							<Chip
								label={STATUS_LABELS[deadline.status as DeadlineStatus]}
								color={STATUS_COLORS[deadline.status as DeadlineStatus]}
								size="small"
							/>
						}
					/>
					{deadline.description && (
						<DetailRow label="Description" value={deadline.description} />
					)}
					<DetailRow
						label="Claim"
						value={<ClaimLink claimId={deadline.claim_id} claimNumber={deadline.claim_number} />}
					/>
				</Box>
			</Box>
		</BasicDialog>
	);
}
