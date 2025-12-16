'use client';

import { Stack, TextField, MenuItem, Select, FormControl, InputLabel, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import AddTask from '@mui/icons-material/AddTask';
import BasicDialog from './BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useTaskTrpc } from '@/hooks/trpc/useTaskTrpc';
import { useAlertStore } from '@/stores/useAlertStore';
import DeskLocationTypeSelect from './DeskLocationTypeSelect';
import DeskLocationSelect from './DeskLocationSelect';
import TaskTypeSelect from './TaskTypeSelect';
import { TaskType } from '@/config/enums';
import dayjs, { Dayjs } from 'dayjs';

interface TaskFormInputs {
	title: string;
	description: string;
	taskType: TaskType;
	deskLocationTypeId: number | null;
	deskLocationId: number | null;
	dueDate: Dayjs | null;
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
				deadlineDate: data.dueDate ? data.dueDate.format('YYYY-MM-DD') : undefined,
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
				icon: <AddTask />,
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
			<Stack width="100%" display="flex" alignItems="center" spacing={2}>
				{claimNumber && (
					<Typography variant="body2" color="text.secondary" sx={{ width: 400, marginBottom: 1 }}>
						Creating task for claim: {claimNumber}
					</Typography>
				)}

				<Controller
					name="title"
					control={control}
					rules={{ required: 'Title is required', minLength: 1 }}
					render={({ field }) => (
						<TextField
							{...field}
							label="Task Title"
							
							required
							error={!!errors.title}
							helperText={errors.title?.message}
							sx={{ width: 400 }}
							disabled={isPending}
						/>
					)}
				/>

				<Controller
					name="description"
					control={control}
					render={({ field }) => (
						<TextField
							{...field}
							label="Description (optional)"
							
							multiline
							rows={2}
							sx={{ width: 400 }}
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
						<DatePicker
							label="Due Date (optional)"
							value={field.value}
							onChange={(newValue) => field.onChange(newValue)}
							disabled={isPending}
							slotProps={{
								textField: {
									variant: 'standard',
									sx: { width: 400 },
								},
							}}
						/>
					)}
				/>

				<FormControl sx={{ width: 400 }}>
					<InputLabel>Work Units (1 unit = 5 min)</InputLabel>
					<Controller
						name="workUnits"
						control={control}
						render={({ field }) => (
							<Select {...field} disabled={isPending}>
								<MenuItem value={1}>1 unit (5 min)</MenuItem>
								<MenuItem value={2}>2 units (10 min)</MenuItem>
								<MenuItem value={3}>3 units (15 min)</MenuItem>
								<MenuItem value={4}>4 units (20 min)</MenuItem>
								<MenuItem value={5}>5 units (25 min)</MenuItem>
								<MenuItem value={6}>6 units (30 min)</MenuItem>
								<MenuItem value={8}>8 units (40 min)</MenuItem>
								<MenuItem value={10}>10 units (50 min)</MenuItem>
								<MenuItem value={12}>12 units (1 hour)</MenuItem>
							</Select>
						)}
					/>
				</FormControl>
			</Stack>
		</BasicDialog>
	);
}
