'use client';

import { Stack, TextField, Typography } from '@mui/material';
import Cancel from '@mui/icons-material/Cancel';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useTaskTrpc } from '@/hooks/trpc/useTaskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';

interface TaskBulkCancellationFormInputs {
	cancellationReason: string;
}

interface TaskBulkCancellationDialogProps {
	taskIds: number[];
	onClose: () => void;
	onCancelled?: () => void;
}

export default function TaskBulkCancellationDialog({
	taskIds,
	onClose,
	onCancelled,
}: TaskBulkCancellationDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const { mutateAsync: bulkCancelTasks, isPending } = useTaskTrpc().bulkCancel;

	const {
		control,
		handleSubmit,
		watch,
		formState: { errors },
	} = useForm<TaskBulkCancellationFormInputs>({
		defaultValues: {
			cancellationReason: '',
		},
	});

	const cancellationReason = watch('cancellationReason');

	const onSubmit = handleSubmit(async (data) => {
		try {
			const result = await bulkCancelTasks({
				ids: taskIds,
				cancellationReason: data.cancellationReason,
			});

			showAlert(`${result.cancelledCount} task${result.cancelledCount === 1 ? '' : 's'} cancelled`, 'success');
			onCancelled?.();
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to cancel tasks';
			showAlert(message, 'error');
		}
	});

	return (
		<BasicDialog
			title="Cancel Tasks"
			primaryAction={{
				label: `Cancel ${taskIds.length} Task${taskIds.length === 1 ? '' : 's'}`,
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
					You are about to cancel <strong>{taskIds.length}</strong> task
					{taskIds.length === 1 ? '' : 's'}. This action cannot be undone.
				</Typography>

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
							helperText={errors.cancellationReason?.message || 'This reason will be applied to all selected tasks'}
							placeholder="Explain why these tasks are being cancelled..."
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}
