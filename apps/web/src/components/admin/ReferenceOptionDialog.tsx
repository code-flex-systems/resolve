'use client';

import { IconSend } from '@tabler/icons-react';
import { FormControlLabel } from '@mui/material';
import Input, { Textarea } from '@/components/ui/Input';
import Switch from '@/components/ui/Switch';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useReferenceDataTrpc, type ReferenceOption } from '@/hooks/trpc/useReferenceDataTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import { REFERENCE_ENTITY_DISPLAY } from '@/schemas/referenceDataSchemas';

interface ReferenceOptionFormInputs {
	value: string;
	display_label: string;
	description: string;
	icon_emoji: string;
	is_active: boolean;
}

interface ReferenceOptionDialogProps {
	option?: ReferenceOption;
	onClose?: () => void;
}

export default function ReferenceOptionDialog({ option, onClose }: ReferenceOptionDialogProps) {
	const toggleNewReferenceOptionDialog = useAdminStore((state) => state.toggleNewReferenceOptionDialog);
	const selectedReferenceEntity = useAdminStore((state) => state.selectedReferenceEntity);
	const referenceDataTrpc = useReferenceDataTrpc();
	const { mutateAsync: createOption, isPending: creating } = referenceDataTrpc.createOption;
	const { mutateAsync: updateOption, isPending: updating } = referenceDataTrpc.updateOption;

	const isEditMode = !!option;
	const isPending = creating || updating;
	const entityLabel = selectedReferenceEntity
		? REFERENCE_ENTITY_DISPLAY[selectedReferenceEntity].label
		: 'Option';

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting, isValid, isDirty },
	} = useForm<ReferenceOptionFormInputs>({
		defaultValues: option
			? {
					value: option.value,
					display_label: option.display_label,
					description: option.description || '',
					icon_emoji: option.icon_emoji || '',
					is_active: option.is_active,
				}
			: {
					value: '',
					display_label: '',
					description: '',
					icon_emoji: '',
					is_active: true,
				},
		mode: 'onChange',
	});

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewReferenceOptionDialog();
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		if (!selectedReferenceEntity) return;

		try {
			if (isEditMode && option) {
				await updateOption({
					id: option.id,
					params: {
						display_label: data.display_label,
						description: data.description || undefined,
						icon_emoji: data.icon_emoji || undefined,
						is_active: data.is_active,
					},
				});
			} else {
				await createOption({
					entity: selectedReferenceEntity,
					value: data.value,
					display_label: data.display_label,
					description: data.description || undefined,
					icon_emoji: data.icon_emoji || undefined,
				});
			}

			handleClose();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title={isEditMode ? `Edit ${entityLabel}` : `New ${entityLabel}`}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: onSubmit,
				icon: isEditMode ? undefined : <IconSend size={20} />,
				disabled:
					isSubmitting ||
					isPending ||
					!isValid ||
					(isEditMode && !isDirty) ||
					!selectedReferenceEntity,
			}}
			onClose={handleClose}
			width={500}
		>
			<div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
				<Controller
					name="value"
					control={control}
					rules={{
						required: 'Value is required',
						minLength: { value: 1, message: 'Value is required' },
						maxLength: { value: 100, message: 'Value must be 100 characters or less' },
						pattern: {
							value: /^[a-z0-9_]+$/,
							message: 'Only lowercase letters, numbers, and underscores',
						},
					}}
					render={({ field }) => (
						<Input
							label="Value (key)"
							placeholder="lowercase_value"
							error={!!errors.value}
							errorText={errors.value?.message}
							helperText={!errors.value ? 'Unique identifier (lowercase, underscores only)' : undefined}
							{...field}
							disabled={isSubmitting || isEditMode}
							style={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="display_label"
					control={control}
					rules={{
						required: 'Display label is required',
						minLength: { value: 1, message: 'Display label is required' },
						maxLength: { value: 255, message: 'Display label must be 255 characters or less' },
					}}
					render={({ field }) => (
						<Input
							label="Display Label"
							placeholder="Human-readable label"
							error={!!errors.display_label}
							errorText={errors.display_label?.message}
							{...field}
							disabled={isSubmitting}
							style={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="description"
					control={control}
					rules={{
						maxLength: { value: 500, message: 'Description must be 500 characters or less' },
					}}
					render={({ field }) => (
						<Textarea
							label="Description"
							placeholder="Optional description"
							rows={2}
							error={!!errors.description}
							errorText={errors.description?.message}
							{...field}
							disabled={isSubmitting}
							style={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="icon_emoji"
					control={control}
					rules={{
						maxLength: { value: 10, message: 'Emoji must be 10 characters or less' },
					}}
					render={({ field }) => (
						<Input
							label="Icon Emoji"
							placeholder="Optional emoji icon"
							error={!!errors.icon_emoji}
							errorText={errors.icon_emoji?.message}
							helperText={!errors.icon_emoji ? 'Single emoji for visual display' : undefined}
							{...field}
							disabled={isSubmitting}
							style={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="is_active"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={<Switch checked={field.value} onChange={(checked) => field.onChange(checked)} disabled={isSubmitting} />}
							label="Active"
							style={{ width: 400, fontSize: 13 }}
						/>
					)}
				/>

				{option?.is_system_default && (
					<span style={{  color: 'var(--text-secondary)' ,  width: 400  }}>
						This is a system default option and cannot be deleted.
					</span>
				)}
			</div>
		</BasicDialog>
	);
}

const styles = {
	textFieldOverrides: {
		width: 400,
		margin: '5px 0px',
		},
};
