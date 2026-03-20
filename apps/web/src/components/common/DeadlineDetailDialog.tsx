'use client';

import { useState } from 'react';
import Chip from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Progress';
import Divider from '@/components/ui/Divider';
import {
	IconCircleCheck, IconX, IconPlayerPlay, IconPlayerStop,
	IconUserPlus, IconCalendar, IconUser, IconClipboard,
} from '@tabler/icons-react';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
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

const STATUS_COLORS: Record<DeadlineStatus, 'neutral' | 'info' | 'success' | 'error' | 'warning'> = {
	[DeadlineStatus.PENDING]: 'neutral',
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

const TASK_STATUS_COLORS: Record<TaskStatus, 'neutral' | 'info' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'neutral',
	[TaskStatus.IN_PROGRESS]: 'info',
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
		<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '6px 0' }}>
			<span style={{ fontSize: 13, color: 'var(--text-secondary)', minWidth: 120 }}>
				{label}
			</span>
			<div style={{ textAlign: 'right', flex: 1 }}>
				{typeof value === 'string' ? <span style={{ fontSize: 13 }}>{value}</span> : value}
			</div>
		</div>
	);
}

function ClaimLink({ claimId, claimNumber }: { claimId: number; claimNumber: string | null }) {
	const router = useRouter();

	return (
		<span
			style={{
				fontSize: 13,
				color: 'var(--color-primary)',
				cursor: 'pointer',
			}}
			onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
			onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
			onClick={() => router.push(`/my-claims/${claimId}`)}
		>
			{claimNumber || `Claim #${claimId}`}
		</span>
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
	const { data: task, isLoading: taskLoading } = useTaskTrpc().get({ id: taskId! }, { enabled: !!taskId });

	const { mutateAsync: startTask, isPending: isStarting } = useTaskTrpc().start;
	const { mutateAsync: unassignTask, isPending: isUnassigning } = useTaskTrpc().unassign;
	const { mutateAsync: assignTask, isPending: isAssigning } = useTaskTrpc().assign;

	const isOverdue = dayjs(deadline.deadline_date).isBefore(dayjs());
	const isPendingDeadline = deadline.status === DeadlineStatus.PENDING;

	// Determine task status and user permissions for actions
	const isTaskPending = task?.status === TaskStatus.PENDING;
	const isTaskInProgress = task?.status === TaskStatus.IN_PROGRESS;
	const isUserAssignedTo = task?.assigned_to === session?.user?.id;
	const isAssigned = !!task?.assigned_to;

	// Action availability
	const canAssignToMe = task && isTaskPending && !isAssigned;
	const canStartTask = task && isTaskPending && isUserAssignedTo;
	const canReleaseTask = task && (isTaskPending || isTaskInProgress) && isUserAssignedTo;
	const canCompleteTask = task && isTaskInProgress && (isAdmin || isUserAssignedTo);
	const canCancelTask = task && (isTaskPending || isTaskInProgress) && isAdmin;

	const handleStartTask = async () => {
		if (!task) return;
		try {
			await startTask({ id: task.id });
			showAlert('Task started - you can now work on it', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to start task', 'error');
		}
	};

	const handleReleaseTask = async () => {
		if (!task) return;
		try {
			await unassignTask({ id: task.id });
			showAlert('Task released back to queue', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to release task', 'error');
		}
	};

	const handleAssignToMe = async () => {
		if (!task || !session?.user?.id) return;
		try {
			await assignTask({ id: task.id, userId: session.user.id });
			showAlert('Task assigned to you', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to assign task', 'error');
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
				<div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
					<Spinner size="lg" />
				</div>
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
					<div style={containerStyles.section as React.CSSProperties}>
						<div style={containerStyles.sectionTitle as React.CSSProperties}>
							<IconClipboard size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
							{task.title}
						</div>
						<div style={containerStyles.sectionContent as React.CSSProperties}>
							<DetailRow
								label="Type"
								value={
									<div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
										{TASK_TYPE_CONFIG[task.task_type as TaskType]?.icon}
										<span style={{ fontSize: 13 }}>
											{TASK_TYPE_CONFIG[task.task_type as TaskType]?.label || task.task_type}
										</span>
									</div>
								}
							/>
							<DetailRow
								label="Status"
								value={
									<Chip
										color={TASK_STATUS_COLORS[task.status as TaskStatus]}
										size="sm"
										>{TASK_STATUS_LABELS[task.status as TaskStatus]}</Chip>
								}
							/>
							<DetailRow
								label="Due Date"
								value={
									<span
										style={{
											fontSize: 13,
											color: isOverdue && isPendingDeadline ? 'var(--color-error)' : 'inherit',
											fontWeight: isOverdue && isPendingDeadline ? 600 : 400,
										}}
									>
										{dayjs(deadline.deadline_date).format('MMM D, YYYY')}
										{isOverdue && isPendingDeadline && ' (Overdue)'}
									</span>
								}
							/>
							{task.description && <DetailRow label="Description" value={task.description} />}
							{task.assigned_to_first && task.assigned_to_last && (
								<DetailRow
									label="Assigned To"
									value={
										<div style={{ display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'flex-end' }}>
											<IconUser size={14} style={{ color: BASE_COLOR_LIGHT }} />
											<span style={{ fontSize: 13 }}>
												{task.assigned_to_first} {task.assigned_to_last}
											</span>
										</div>
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
							{(canAssignToMe || canStartTask || canReleaseTask || canCompleteTask || canCancelTask) && (
								<>
									<Divider spacing="md" />
									<div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
										{canAssignToMe && (
											<Button
												size="sm"
												variant="outlined"
												color="primary"
												startIcon={<IconUserPlus size={16} />}
												onClick={handleAssignToMe}
												disabled={isAssigning}
											>
												Assign to Me
											</Button>
										)}
										{canStartTask && (
											<Button
												size="sm"
												variant="outlined"
												color="primary"
												startIcon={<IconPlayerPlay size={16} />}
												onClick={handleStartTask}
												disabled={isStarting}
											>
												Start Task
											</Button>
										)}
										{canReleaseTask && (
											<Button
												size="sm"
												variant="outlined"
												color="warning"
												startIcon={<IconPlayerStop size={16} />}
												onClick={handleReleaseTask}
												disabled={isUnassigning}
											>
												Release Task
											</Button>
										)}
										{canCancelTask && (
											<Button
												size="sm"
												variant="outlined"
												color="error"
												startIcon={<IconX size={16} />}
												onClick={() => setShowCancellationDialog(true)}
											>
												Cancel Task
											</Button>
										)}
										{canCompleteTask && (
											<Button
												size="sm"
												variant="contained"
												color="success"
												startIcon={<IconCircleCheck size={16} />}
												onClick={() => setShowCompletionDialog(true)}
											>
												Complete Task
											</Button>
										)}
									</div>
								</>
							)}
						</div>
					</div>
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
			<div style={containerStyles.section as React.CSSProperties}>
				<div style={containerStyles.sectionTitle as React.CSSProperties}>
					<IconCalendar size={16} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} />
					{formatDeadlineType(deadline.deadline_type)}
				</div>
				<div style={containerStyles.sectionContent as React.CSSProperties}>
					<DetailRow
						label="Due Date"
						value={
							<span style={{ fontSize: 13 }}>{dayjs(deadline.deadline_date).format('MMM D, YYYY')}</span>
						}
					/>
					<DetailRow
						label="Status"
						value={
							<Chip
								color={STATUS_COLORS[deadline.status as DeadlineStatus]}
								size="sm"
								>{STATUS_LABELS[deadline.status as DeadlineStatus]}</Chip>
						}
					/>
					{deadline.description && <DetailRow label="Description" value={deadline.description} />}
					<DetailRow
						label="Claim"
						value={<ClaimLink claimId={deadline.claim_id} claimNumber={deadline.claim_number} />}
					/>
				</div>
			</div>
		</BasicDialog>
	);
}
