'use client';

import { Stack, TextField, Typography } from '@mui/material';
import CheckCircle from '@mui/icons-material/CheckCircle';
import BasicDialog from './BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface TaskCompletionFormInputs {
	completionNotes: string;
}

interface TaskCompletionDialogProps {
	task: Task;
	onClose: () => void;
	onCompleted?: () => void;
}

export default function TaskCompletionDialog({
	task,
	onClose,
	onCompleted,
}: TaskCompletionDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const { mutateAsync: completeTask, isPending } = useTaskTrpc().complete;

	const {
		control,
		handleSubmit,
	} = useForm<TaskCompletionFormInputs>({
		defaultValues: {
			completionNotes: '',
		},
	});

	const onSubmit = handleSubmit(async (data) => {
		try {
			await completeTask({
				id: task.id,
				completionNotes: data.completionNotes || undefined,
			});

			showAlert('Task completed successfully', 'success');
			onCompleted?.();
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to complete task';
			showAlert(message, 'error');
		}
	});

	return (
		<BasicDialog
			title="Complete Task"
			primaryAction={{
				label: 'Complete Task',
				onClick: onSubmit,
				icon: <CheckCircle />,
				disabled: isPending,
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={450}
		>
			<Stack width="100%" display="flex" alignItems="center" spacing={2}>
				<Typography variant="body2" sx={{ width: 380, marginBottom: 1 }}>
					<strong>Task:</strong> {task.title}
				</Typography>

				{task.description && (
					<Typography variant="body2" color="text.secondary" sx={{ width: 380 }}>
						{task.description}
					</Typography>
				)}

				<Controller
					name="completionNotes"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Completion Notes (optional)"
							variant="standard"
							multiline
							rows={3}
							sx={{ width: 380 }}
							disabled={isPending}
							placeholder="Add any notes about how the task was completed..."
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}
