'use client';

import Chip from '@/components/ui/Chip';
import { Spinner } from '@/components/ui/Progress';
import Tooltip from '@/components/ui/Tooltip';

import {
	IconSubtask,
	IconPlayerPlay,
	IconSettings,
	IconPlayerStop,
	IconCircleCheck,
	IconX,
	IconUserPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { TaskStatus, TaskType } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import { useSession } from '@/lib/auth/use-session';
import useIsAdmin from '@/hooks/useIsAdmin';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import Button from '@/components/ui/Button';
import TaskCreationDialog from './TaskCreationDialog';
import TaskCompletionDialog from './TaskCompletionDialog';
import TaskCancellationDialog from './TaskCancellationDialog';
import DataTable, { type ColumnDef } from '@/components/ui/DataTable';

interface TaskListPanelProps {
	claimId: string;
	claimNumber?: string;
	showCreateButton?: boolean;
}

const STATUS_COLORS: Record<TaskStatus, 'neutral' | 'info' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'neutral',
	[TaskStatus.IN_PROGRESS]: 'info',
	[TaskStatus.COMPLETED]: 'success',
	[TaskStatus.CANCELLED]: 'error',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
	[TaskStatus.PENDING]: 'Pending',
	[TaskStatus.IN_PROGRESS]: 'In Progress',
	[TaskStatus.COMPLETED]: 'Completed',
	[TaskStatus.CANCELLED]: 'Cancelled',
};

export default function TaskListPanel({
	claimId,
	claimNumber,
	showCreateButton = true,
}: TaskListPanelProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [completingTask, setCompletingTask] = useState<Task | null>(null);
	const [cancellingTask, setCancellingTask] = useState<Task | null>(null);
	const [isManageMode, setIsManageMode] = useState(false);

	const showAlert = useAlertStore((state) => state.showAlert);
	const { data: session } = useSession();
	const isAdmin = useIsAdmin();

	const { data, isLoading, refetch } = useTaskTrpc().listByClaim({
		claimId,
	});

	const { mutateAsync: startTask, isPending: starting } = useTaskTrpc().start;
	const { mutateAsync: unassignTask, isPending: unassigning } = useTaskTrpc().unassign;
	const { mutateAsync: assignTask, isPending: assigning } = useTaskTrpc().assign;

	const tasks = data?.rows || [];

	const handleStartTask = async (taskId: string) => {
		try {
			await startTask({ id: taskId });
			showAlert('Task started - you can now work on it', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to start task', 'error');
		}
	};

	const handleUnassignTask = async (taskId: string) => {
		try {
			await unassignTask({ id: taskId });
			showAlert('Task released back to queue', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to release task', 'error');
		}
	};

	const handleAssignToMe = async (taskId: string) => {
		try {
			await assignTask({ id: taskId, userId: session!.user!.id });
			showAlert('Task assigned to you', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to assign task', 'error');
		}
	};

	const columns: ColumnDef<any, any>[] = useMemo(() => {
		const baseColumns: ColumnDef<any, any>[] = [
			{
				accessorKey: 'title',
				header: 'Title',
				minSize: 200,
			},
			{
				accessorKey: 'task_type',
				header: 'Type',
				size: 150,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const taskType = params.value as TaskType;
					const config = TASK_TYPE_CONFIG[taskType];
					if (!config) return params.value || '-';
					return (
						<div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
							{config.icon}
							<span style={{ fontSize: 14 }}>{config.label}</span>
						</div>
					);
				},
			},
			{
				accessorKey: 'desk_location_name',
				header: 'Desk Location',
				size: 180,
			},
			{
				accessorKey: 'status',
				header: 'Status',
				size: 120,
				cell: (params: { row: any; value?: any }) => (
					<Chip color={STATUS_COLORS[params.value as TaskStatus]} size="sm">
						{STATUS_LABELS[params.value as TaskStatus]}
					</Chip>
				),
			},
			{
				accessorKey: 'work_units',
				header: 'Work Units',
				size: 100,
				cell: (params: { row: any; value?: any }) => (
					<span style={{ fontSize: 14 }}>
						{params.value} ({params.value * 5} min)
					</span>
				),
			},
			{
				accessorKey: 'due_date',
				header: 'Due Date',
				size: 110,
				cell: (params: { row: any; value?: any }) =>
					params.value ? new Date(params.value).toLocaleDateString() : '-',
			},
			{
				accessorKey: 'assigned_to_name',
				header: 'Assigned To',
				size: 140,
			},
		];

		// Only include actions column when in manage mode
		if (isManageMode) {
			baseColumns.push({
				accessorKey: 'actions',
				header: '',
				size: 120,
				enableSorting: false,
				cell: (info: any) => {
					const params = { row: info.row.original, value: info.getValue() };
					const task = params.row;
					const status = task.status as TaskStatus;
					const isAssignedToMe = task.assigned_to === session?.user?.id;
					const isAssigned = !!task.assigned_to;

					return (
						<div
							style={{
								display: 'flex',
								flexDirection: 'row',
								gap: 4,
								justifyContent: 'flex-end',
								width: '100%',
							}}
						>
							{/* Unassigned + PENDING: Assign to Me */}
							{status === TaskStatus.PENDING && !isAssigned && (
								<Tooltip content="Assign task to yourself">
									<Button
										variant="icon"
										size="sm"
										color="neutral"
										onClick={() => handleAssignToMe(task.id)}
										disabled={assigning}
									>
										<IconUserPlus size={15} style={{ color: 'var(--text-accent)' }} />
									</Button>
								</Tooltip>
							)}
							{/* Assigned to me + PENDING: Start */}
							{status === TaskStatus.PENDING && isAssignedToMe && (
								<Tooltip content="Start working on this task">
									<Button
										variant="icon"
										size="sm"
										color="neutral"
										onClick={() => handleStartTask(task.id)}
										disabled={starting}
									>
										<IconPlayerPlay size={15} style={{ color: 'var(--text-accent)' }} />
									</Button>
								</Tooltip>
							)}
							{/* Assigned to me + PENDING or IN_PROGRESS: Release */}
							{(status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS) &&
								isAssignedToMe && (
									<Tooltip content="Release task back to queue">
										<Button
											variant="icon"
											size="sm"
											color="neutral"
											onClick={() => handleUnassignTask(task.id)}
											disabled={unassigning}
										>
											<IconPlayerStop size={15} style={{ color: 'var(--status-warning)' }} />
										</Button>
									</Tooltip>
								)}
							{/* Assigned to me (or admin) + IN_PROGRESS: Complete */}
							{status === TaskStatus.IN_PROGRESS && (isAdmin || isAssignedToMe) && (
								<Tooltip content="Mark task as complete">
									<Button variant="icon" size="sm" color="neutral">
										<IconCircleCheck size={15} style={{ color: 'var(--status-success)' }} />
									</Button>
								</Tooltip>
							)}
							{/* Admin only: Cancel (pending or in progress) */}
							{(status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS) && isAdmin && (
								<Tooltip content="Cancel task">
									<Button variant="icon" size="sm" color="neutral">
										<IconX size={15} style={{ color: 'var(--status-error)' }} />
									</Button>
								</Tooltip>
							)}
						</div>
					);
				},
			});
		}

		return baseColumns;
	}, [isManageMode, starting, unassigning, assigning, session?.user?.id, isAdmin]);

	if (isLoading) {
		return (
			<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
				<Spinner size="md" />
			</div>
		);
	}

	return (
		<div>
			<div
				style={{
					display: 'flex',
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 16,
				}}
			>
				<span style={{ fontSize: 16, fontWeight: 500 }}>Tasks ({tasks.length})</span>
				<div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
					{showCreateButton && (
						<Button
							size="sm"
							variant="text"
							startIcon={<IconSubtask size={18} />}
							onClick={() => setShowCreateDialog(true)}
						>
							Create Task
						</Button>
					)}
					<Tooltip content="Manage">
						<Button variant="icon" size="sm" onClick={() => setIsManageMode(!isManageMode)}>
							<IconSettings
								size={18}
								style={{ color: isManageMode ? 'var(--text-accent)' : undefined }}
							/>
						</Button>
					</Tooltip>
				</div>
			</div>

			{tasks.length === 0 ? (
				<p
					style={{
						fontSize: 14,
						color: 'var(--text-secondary)',
						textAlign: 'center',
						padding: '24px 0',
					}}
				>
					No tasks for this claim
				</p>
			) : (
				<DataTable
					rows={tasks}
					columns={columns}
					hideFooter
					pinnedRight={isManageMode ? ['actions'] : []}
				/>
			)}

			{showCreateDialog && (
				<TaskCreationDialog
					claimId={claimId}
					claimNumber={claimNumber}
					onClose={() => setShowCreateDialog(false)}
					onCreated={refetch}
				/>
			)}

			{completingTask && (
				<TaskCompletionDialog
					task={completingTask}
					onClose={() => setCompletingTask(null)}
					onCompleted={refetch}
				/>
			)}

			{cancellingTask && (
				<TaskCancellationDialog
					task={cancellingTask}
					onClose={() => setCancellingTask(null)}
					onCancelled={refetch}
				/>
			)}
		</div>
	);
}
