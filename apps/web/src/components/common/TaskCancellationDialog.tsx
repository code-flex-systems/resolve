'use client';

import { Stack, TextField, Typography } from '@mui/material';
import Cancel from '@mui/icons-material/Cancel';
import BasicDialog from './BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useTaskTrpc, Task } from '@/hooks/trpc/useTaskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface TaskCancellationFormInputs {
	cancellationReason: string;
}

interface TaskCancellationDialogProps {
	task: Task;
	onClose: () => void;
	onCancelled?: () => void;
}

export default function TaskCancellationDialog({ task, onClose, onCancelled }: TaskCancellationDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const { mutateAsync: cancelTask, isPending } = useTaskTrpc().cancel;

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<TaskCancellationFormInputs>({
		defaultValues: {
			cancellationReason: '',
		},
	});

	const cancellationReason = watch('cancellationReason');

	const onSubmit = handleSubmit(async (data) => {
		try {
			await cancelTask({
				id: task.id,
				cancellationReason: data.cancellationReason,
			});

			showAlert('Task cancelled', 'success');
			onCancelled?.();
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to cancel task';
			showAlert(message, 'error');
		}
	});

	return (
		<BasicDialog
			title="Cancel Task"
			primaryAction={{
				label: 'Cancel Task',
				onClick: onSubmit,
				icon: <Cancel />,
				color: 'error',
				disabled: isPending || !cancellationReason.trim(),
			}}
			secondaryActions={[
				{
					label: 'Go Back',
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
					name="cancellationReason"
					control={control}
					rules={{ required: 'Cancellation reason is required' }}
					render={({ field }) => (
						<TextField
							{...field}
							label="Cancellation Reason"
							
							multiline
							rows={3}
							sx={{ width: 380 }}
							disabled={isPending}
							required
							error={!!errors.cancellationReason}
							helperText={errors.cancellationReason?.message}
							placeholder="Explain why this task is being cancelled..."
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}
