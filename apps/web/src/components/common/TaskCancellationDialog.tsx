'use client';

import { Textarea } from '@/components/ui/Input';
import { IconX } from '@tabler/icons-react';
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

export default function TaskCancellationDialog({
	task,
	onClose,
	onCancelled,
}: TaskCancellationDialogProps) {
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
				icon: <IconX size={18} />,
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
			<div
				style={{
					width: '100%',
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'center',
					gap: 16,
				}}
			>
				<p style={{ fontSize: 14, width: 380, marginBottom: 8 }}>
					<strong>Task:</strong> {task.title}
				</p>

				{task.description && (
					<p style={{ fontSize: 14, color: 'var(--text-secondary)', width: 380 }}>
						{task.description}
					</p>
				)}

				<Controller
					name="cancellationReason"
					control={control}
					rules={{ required: 'Cancellation reason is required' }}
					render={({ field }) => (
						<Textarea
							{...field}
							label="Cancellation Reason"
							rows={3}
							style={{ width: 380 }}
							disabled={isPending}
							required
							error={!!errors.cancellationReason}
							errorText={errors.cancellationReason?.message}
							placeholder="Explain why this task is being cancelled..."
						/>
					)}
				/>
			</div>
		</BasicDialog>
	);
}
