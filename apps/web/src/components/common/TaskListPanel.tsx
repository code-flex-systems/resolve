'use client';

import { Box, Typography, Chip, Stack, Button, CircularProgress } from '@mui/material';
import { DataGridPro, GridColDef, GridRenderCellParams } from '@mui/x-data-grid-pro';
import AddTask from '@mui/icons-material/AddTask';
import PlayArrow from '@mui/icons-material/PlayArrow';
import Stop from '@mui/icons-material/Stop';
import CheckCircle from '@mui/icons-material/CheckCircle';
import Cancel from '@mui/icons-material/Cancel';
import { useState } from 'react';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { TaskStatus, TaskType } from '@/config/enums';
import { useAlertStore } from '@/stores/useAlertStore';
import { TASK_TYPE_CONFIG } from '@/lib/utils/taskUtils';
import BasicButtonStyled from './BasicButtonStyled';
import TaskCreationDialog from './TaskCreationDialog';
import TaskCompletionDialog from './TaskCompletionDialog';
import TaskCancellationDialog from './TaskCancellationDialog';
import theme from '@/styles/theme';

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

	const showAlert = useAlertStore((state) => state.showAlert);

	const { data, isLoading, refetch } = useTaskTrpc().listByClaim({
		claimId,
	});

	const { mutateAsync: claimTask, isPending: claiming } = useTaskTrpc().claim;
	const { mutateAsync: unclaimTask, isPending: unclaiming } = useTaskTrpc().unclaim;

	const tasks = data?.rows || [];

	const handleClaimTask = async (taskId: number) => {
		try {
			await claimTask({ id: taskId });
			showAlert('Task claimed - you can now work on it', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to claim task', 'error');
		}
	};

	const handleUnclaimTask = async (taskId: number) => {
		try {
			await unclaimTask({ id: taskId });
			showAlert('Task released back to queue', 'success');
		} catch (error: any) {
			showAlert(error?.message || 'Failed to release task', 'error');
		}
	};

	const columns: GridColDef[] = [
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
					<Stack direction="row" spacing={1} alignItems="center">
						{config.icon}
						<Typography variant="body2">{config.label}</Typography>
					</Stack>
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
				<Typography variant="body2">
					{params.value} ({params.value * 5} min)
				</Typography>
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
			field: 'claimed_by_name',
			headerName: 'Working By',
			width: 140,
			valueGetter: (value, row) =>
				row.claimed_by_first && row.claimed_by_last ? `${row.claimed_by_first} ${row.claimed_by_last}` : '-',
		},
		{
			field: 'actions',
			headerName: '',
			width: 120,
			sortable: false,
			renderCell: (params: GridRenderCellParams) => {
				const task = params.row;
				const status = task.status as TaskStatus;

				return (
					<Stack direction="row" spacing={0.5} justifyContent="flex-end" width="100%">
						{status === TaskStatus.PENDING && (
							<>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => handleClaimTask(task.id),
										disabled: claiming,
									}}
									tooltipProps={{ title: 'Start working on this task' }}
									icon={<PlayArrow sx={{ fontSize: 15, color: theme.palette.primary.main }} />}
								/>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => setCancellingTask(task),
									}}
									tooltipProps={{ title: 'Cancel task' }}
									icon={<Cancel sx={{ fontSize: 15, color: theme.palette.error.main }} />}
								/>
							</>
						)}
						{status === TaskStatus.IN_PROGRESS && (
							<>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => handleUnclaimTask(task.id),
										disabled: unclaiming,
									}}
									tooltipProps={{ title: 'Release task back to queue' }}
									icon={<Stop sx={{ fontSize: 15, color: theme.palette.warning.main }} />}
								/>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => setCompletingTask(task),
									}}
									tooltipProps={{ title: 'Mark task as complete' }}
									icon={<CheckCircle sx={{ fontSize: 15, color: theme.palette.success.main }} />}
								/>
								<BasicButtonStyled
									buttonProps={{
										onClick: () => setCancellingTask(task),
									}}
									tooltipProps={{ title: 'Cancel task' }}
									icon={<Cancel sx={{ fontSize: 15, color: theme.palette.error.main }} />}
								/>
							</>
						)}
					</Stack>
				);
			},
		},
	];

	if (isLoading) {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" p={3}>
				<CircularProgress size={24} />
			</Box>
		);
	}

	return (
		<Box>
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
				<Typography variant="subtitle1" fontWeight={500}>
					Tasks ({tasks.length})
				</Typography>
				{showCreateButton && (
					<Button startIcon={<AddTask />} size="small" onClick={() => setShowCreateDialog(true)}>
						Create Task
					</Button>
				)}
			</Stack>

			{tasks.length === 0 ? (
				<Typography variant="body2" color="text.secondary" textAlign="center" py={3}>
					No tasks for this claim
				</Typography>
			) : (
				<DataGridPro
					rows={tasks}
					columns={columns}
					autoHeight
					hideFooter
					disableColumnMenu
					disableRowSelectionOnClick
					pinnedColumns={{ right: ['actions'] }}
					sx={{
						'& .MuiDataGrid-cell': {
							py: 1,
							display: 'flex',
							alignItems: 'center',
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
		</Box>
	);
}
