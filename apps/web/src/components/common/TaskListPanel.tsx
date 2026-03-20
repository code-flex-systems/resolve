'use client';

import { Chip, CircularProgress, Tooltip, IconButton } from '@mui/material';
import { DataGridPro, GridColDef, GridPinnedColumnFields, GridRenderCellParams, gridClasses } from '@mui/x-data-grid-pro';
import {
	IconSubtask, IconPlayerPlay, IconSettings, IconPlayerStop,
	IconCircleCheck, IconX, IconUserPlus,
} from '@tabler/icons-react';
import { useMemo, useState } from 'react';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { TaskStatus, TaskType } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import { useClerkSession } from '@/lib/auth/use-clerk-session';
import useIsAdmin from '@/hooks/useIsAdmin';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import Button from '@/components/ui/Button';
import BasicButtonStyled from './BasicButtonStyled';
import TaskCreationDialog from './TaskCreationDialog';
import TaskCompletionDialog from './TaskCompletionDialog';
import TaskCancellationDialog from './TaskCancellationDialog';
import { dataGridFocusStyles } from '@/styles/theme';

interface TaskListPanelProps {
	claimId: number;
	claimNumber?: string;
	showCreateButton?: boolean;
}

const STATUS_COLORS: Record<TaskStatus, 'default' | 'primary' | 'success' | 'error'> = {
	[TaskStatus.PENDING]: 'default',
	[TaskStatus.IN_PROGRESS]: 'primary',
	[TaskStatus.COMPLETED]: 'success',
	[TaskStatus.CANCELLED]: 'error',
};

const STATUS_LABELS: Record<TaskStatus, string> = {
	[TaskStatus.PENDING]: 'Pending',
	[TaskStatus.IN_PROGRESS]: 'In Progress',
	[TaskStatus.COMPLETED]: 'Completed',
	[TaskStatus.CANCELLED]: 'Cancelled',
};

export default function TaskListPanel({ claimId, claimNumber, showCreateButton = true }: TaskListPanelProps) {
	const [showCreateDialog, setShowCreateDialog] = useState(false);
	const [completingTask, setCompletingTask] = useState<Task | null>(null);
	const [cancellingTask, setCancellingTask] = useState<Task | null>(null);
	const [isManageMode, setIsManageMode] = useState(false);

	const pinnedColumns = useMemo<GridPinnedColumnFields>(() => (isManageMode ? { right: ['actions'] } : {}), [isManageMode]);

	const showAlert = useAlertStore((state) => state.showAlert);
	const { data: session } = useClerkSession();
	const isAdmin = useIsAdmin();

	const { data, isLoading, refetch } = useTaskTrpc().listByClaim({
		claimId,
	});

	const { mutateAsync: startTask, isPending: starting } = useTaskTrpc().start;
	const { mutateAsync: unassignTask, isPending: unassigning } = useTaskTrpc().unassign;
	const { mutateAsync: assignTask, isPending: assigning } = useTaskTrpc().assign;

	const tasks = data?.rows || [];

	const handleStartTask = async (taskId: number) => {
		try {
			await startTask({ id: taskId });
			showAlert('Task started - you can now work on it', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to start task', 'error');
		}
	};

	const handleUnassignTask = async (taskId: number) => {
		try {
			await unassignTask({ id: taskId });
			showAlert('Task released back to queue', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to release task', 'error');
		}
	};

	const handleAssignToMe = async (taskId: number) => {
		try {
			await assignTask({ id: taskId, userId: session!.user!.id });
			showAlert('Task assigned to you', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to assign task', 'error');
		}
	};

	const columns: GridColDef[] = useMemo(() => {
		const baseColumns: GridColDef[] = [
			{
				field: 'title',
				headerName: 'Title',
				flex: 1,
				minWidth: 200,
			},
		{
			field: 'task_type',
			headerName: 'Type',
			width: 150,
			renderCell: (params: GridRenderCellParams) => {
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
			field: 'desk_location_name',
			headerName: 'Desk Location',
			width: 180,
		},
		{
			field: 'status',
			headerName: 'Status',
			width: 120,
			renderCell: (params: GridRenderCellParams) => (
				<Chip
					label={STATUS_LABELS[params.value as TaskStatus]}
					color={STATUS_COLORS[params.value as TaskStatus]}
					size="small"
				/>
			),
		},
		{
			field: 'work_units',
			headerName: 'Work Units',
			width: 100,
			renderCell: (params: GridRenderCellParams) => (
				<span style={{ fontSize: 14 }}>
					{params.value} ({params.value * 5} min)
				</span>
			),
		},
		{
			field: 'due_date',
			headerName: 'Due Date',
			width: 110,
			renderCell: (params: GridRenderCellParams) =>
				params.value ? new Date(params.value).toLocaleDateString() : '-',
		},
		{
			field: 'assigned_to_name',
			headerName: 'Assigned To',
			width: 140,
			valueGetter: (value, row) =>
				row.assigned_to_first && row.assigned_to_last ? `${row.assigned_to_first} ${row.assigned_to_last}` : '-',
		},
		];

		// Only include actions column when in manage mode
		if (isManageMode) {
			baseColumns.push({
				field: 'actions',
				headerName: '',
				width: 120,
				sortable: false,
				renderCell: (params: GridRenderCellParams) => {
				const task = params.row;
				const status = task.status as TaskStatus;
				const isAssignedToMe = task.assigned_to === session?.user?.id;
				const isAssigned = !!task.assigned_to;

				return (
					<div style={{ display: 'flex', flexDirection: 'row', gap: 4, justifyContent: 'flex-end', width: '100%' }}>
						{/* Unassigned + PENDING: Assign to Me */}
						{status === TaskStatus.PENDING && !isAssigned && (
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleAssignToMe(task.id),
									disabled: assigning,
								}}
								tooltipProps={{ title: 'Assign task to yourself' }}
								icon={<IconUserPlus size={15} style={{ color: 'var(--text-accent)' }} />}
							/>
						)}
						{/* Assigned to me + PENDING: Start */}
						{status === TaskStatus.PENDING && isAssignedToMe && (
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleStartTask(task.id),
									disabled: starting,
								}}
								tooltipProps={{ title: 'Start working on this task' }}
								icon={<IconPlayerPlay size={15} style={{ color: 'var(--text-accent)' }} />}
							/>
						)}
						{/* Assigned to me + PENDING or IN_PROGRESS: Release */}
						{(status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS) && isAssignedToMe && (
							<BasicButtonStyled
								buttonProps={{
									onClick: () => handleUnassignTask(task.id),
									disabled: unassigning,
								}}
								tooltipProps={{ title: 'Release task back to queue' }}
								icon={<IconPlayerStop size={15} style={{ color: 'var(--status-warning)' }} />}
							/>
						)}
						{/* Assigned to me (or admin) + IN_PROGRESS: Complete */}
						{status === TaskStatus.IN_PROGRESS && (isAdmin || isAssignedToMe) && (
							<BasicButtonStyled
								buttonProps={{
									onClick: () => setCompletingTask(task),
								}}
								tooltipProps={{ title: 'Mark task as complete' }}
								icon={<IconCircleCheck size={15} style={{ color: 'var(--status-success)' }} />}
							/>
						)}
						{/* Admin only: Cancel (pending or in progress) */}
						{(status === TaskStatus.PENDING || status === TaskStatus.IN_PROGRESS) && isAdmin && (
							<BasicButtonStyled
								buttonProps={{
									onClick: () => setCancellingTask(task),
								}}
								tooltipProps={{ title: 'Cancel task' }}
								icon={<IconX size={15} style={{ color: 'var(--status-error)' }} />}
							/>
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
				<CircularProgress size={24} />
			</div>
		);
	}

	return (
		<div>
			<div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
				<span style={{ fontSize: 16, fontWeight: 500 }}>
					Tasks ({tasks.length})
				</span>
				<div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center' }}>
					{showCreateButton && (
						<Button size="sm" variant="text" startIcon={<IconSubtask size={18} />} onClick={() => setShowCreateDialog(true)}>
							Create Task
						</Button>
					)}
					<Tooltip title="Manage">
						<IconButton
							size="small"
							onClick={() => setIsManageMode(!isManageMode)}
							sx={{ bgcolor: isManageMode ? 'action.selected' : undefined }}
						>
							<IconSettings size={18} style={{ color: isManageMode ? 'var(--text-accent)' : undefined }} />
						</IconButton>
					</Tooltip>
				</div>
			</div>

			{tasks.length === 0 ? (
				<p style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}>
					No tasks for this claim
				</p>
			) : (
				<DataGridPro
					rows={tasks}
					columns={columns}
					autoHeight
					hideFooter
					disableColumnMenu
					disableRowSelectionOnClick
					pinnedColumns={pinnedColumns}
					sx={{
						...dataGridFocusStyles,
						[`& .${gridClasses.cell}`]: {
							py: 1,
						},
					}}
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
