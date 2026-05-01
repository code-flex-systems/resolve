'use client';

import { Textarea } from '@/components/ui/Input';
import { IconCircleCheck } from '@tabler/icons-react';
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

	const { control, handleSubmit } = useForm<TaskCompletionFormInputs>({
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
				icon: <IconCircleCheck size={18} />,
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
					name="completionNotes"
					control={control}
					render={({ field }) => (
						<Textarea
							{...field}
							label="Completion Notes (optional)"
							rows={3}
							style={{ width: 380 }}
							disabled={isPending}
							placeholder="Add any notes about how the task was completed..."
						/>
					)}
				/>
			</div>
		</BasicDialog>
	);
}
