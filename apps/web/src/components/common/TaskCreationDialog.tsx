'use client';

import Dropdown from '@/components/ui/Dropdown';
import Input, { Textarea } from '@/components/ui/Input';
import { IconSubtask } from '@tabler/icons-react';
import BasicDialog from './BasicDialog';
import DateField from './DateField';
import { Controller, useForm } from 'react-hook-form';
import { useTaskTrpc } from '@/hooks/trpc/useTaskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import DeskLocationTypeSelect from './DeskLocationTypeSelect';
import DeskLocationSelect from './DeskLocationSelect';
import TaskTypeSelect from './TaskTypeSelect';
import { TaskType } from '@/config/enums';

interface TaskFormInputs {
	title: string;
	description: string;
	taskType: TaskType;
	deskLocationTypeId: number | null;
	deskLocationId: number | null;
	dueDate: string | null;
	workUnits: number;
}

interface TaskCreationDialogProps {
	claimId: number;
	claimNumber?: string;
	onClose: () => void;
	onCreated?: () => void;
}

export default function TaskCreationDialog({
	claimId,
	claimNumber,
	onClose,
	onCreated,
}: TaskCreationDialogProps) {
	const showAlert = useAlertStore((state) => state.showAlert);
	const { mutateAsync: createTask, isPending } = useTaskTrpc().create;

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors },
	} = useForm<TaskFormInputs>({
		defaultValues: {
			title: '',
			description: '',
			taskType: TaskType.GENERIC,
			deskLocationTypeId: null,
			deskLocationId: null,
			dueDate: null,
			workUnits: 2,
		},
		mode: 'onChange',
	});

	const taskType = watch('taskType');
	const deskLocationTypeId = watch('deskLocationTypeId');
	const deskLocationId = watch('deskLocationId');

	const onSubmit = handleSubmit(async (data) => {
		if (!data.deskLocationId) {
			showAlert('Please select a desk location', 'error');
			return;
		}

		try {
			await createTask({
				claimId,
				deskLocationId: data.deskLocationId,
				taskType: data.taskType,
				title: data.title,
				description: data.description || undefined,
				deadlineDate: data.dueDate || undefined,
				workUnits: data.workUnits,
			});

			showAlert('Task created successfully', 'success');
			onCreated?.();
			onClose();
		} catch (error: any) {
			const message = error?.message || 'Failed to create task';
			showAlert(message, 'error');
		}
	});

	return (
		<BasicDialog
			title="Create Task"
			primaryAction={{
				label: 'Create Task',
				onClick: onSubmit,
				icon: <IconSubtask size={18} />,
				disabled: isPending || !deskLocationId || !watch('title'),
			}}
			secondaryActions={[
				{
					label: 'Cancel',
					onClick: onClose,
				},
			]}
			onClose={onClose}
			width={500}
		>
			<div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
				{claimNumber && (
					<p style={{ fontSize: 14, color: 'var(--text-secondary)', width: 400, marginBottom: 8 }}>
						Creating task for claim: {claimNumber}
					</p>
				)}

				<Controller
					name="title"
					control={control}
					rules={{ required: 'Title is required', minLength: 1 }}
					render={({ field }) => (
						<Input
							{...field}
							label="Task Title"
							required
							error={!!errors.title}
							errorText={errors.title?.message}
							style={{ width: 400 }}
							disabled={isPending}
						/>
					)}
				/>

				<Controller
					name="description"
					control={control}
					render={({ field }) => (
						<Textarea
							{...field}
							label="Description (optional)"
							rows={2}
							style={{ width: 400 }}
							disabled={isPending}
						/>
					)}
				/>

				<TaskTypeSelect
					value={taskType}
					onChange={(newValue) => setValue('taskType', newValue)}
					disabled={isPending}
				/>

				<DeskLocationTypeSelect
					value={deskLocationTypeId}
					onChange={(newValue) => {
						setValue('deskLocationTypeId', newValue);
						setValue('deskLocationId', null); // Reset location when type changes
					}}
					required
				/>

				<DeskLocationSelect
					value={deskLocationId}
					onChange={(newValue) => setValue('deskLocationId', newValue)}
					deskLocationTypeId={deskLocationTypeId}
					disabled={!deskLocationTypeId}
					required
				/>

				<Controller
					name="dueDate"
					control={control}
					render={({ field }) => (
						<DateField
							label="Due Date (optional)"
							value={field.value}
							onChange={field.onChange}
							disabled={isPending}
							sx={{ width: 400 }}
						/>
					)}
				/>

				<Controller
					name="workUnits"
					control={control}
					render={({ field }) => (
						<Dropdown
							label="Work Units (1 unit = 5 min)"
							options={[
								{ value: 1, label: '1 unit (5 min)' },
								{ value: 2, label: '2 units (10 min)' },
								{ value: 3, label: '3 units (15 min)' },
								{ value: 4, label: '4 units (20 min)' },
								{ value: 5, label: '5 units (25 min)' },
								{ value: 6, label: '6 units (30 min)' },
								{ value: 8, label: '8 units (40 min)' },
								{ value: 10, label: '10 units (50 min)' },
								{ value: 12, label: '12 units (1 hour)' },
							]}
							value={field.value}
							onChange={(v) => field.onChange(Number(v))}
							disabled={isPending}
							name={field.name}
						/>
					)}
				/>
			</div>
		</BasicDialog>
	);
}
