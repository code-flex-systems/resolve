'use client';

import { Stack, TextField, Switch, FormControlLabel } from '@mui/material';
import Send from '@mui/icons-material/Send';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import type { DeskLocation } from '@/api/database/types';
import DeskLocationTypeSelect from '../common/DeskLocationTypeSelect';

interface DeskLocationFormInputs {
	name: string;
	desk_location_type_id: number | null;
	is_active: boolean;
}

interface DeskLocationDialogProps {
	deskLocation?: DeskLocation;
	onClose?: () => void;
}

export default function DeskLocationDialog({ deskLocation, onClose }: DeskLocationDialogProps) {
	const toggleNewDeskLocationDialog = useAdminStore((state) => state.toggleNewDeskLocationDialog);
	const selectedDeskLocationTypeId = useAdminStore((state) => state.selectedDeskLocationTypeId);
	const deskTrpc = useDeskTrpc();
	const { mutateAsync: createLocation, isPending: creating } = deskTrpc.createLocation;
	const { mutateAsync: updateLocation, isPending: updating } = deskTrpc.updateLocation;

	const isEditMode = !!deskLocation;
	const isPending = creating || updating;

	const {
		control,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting, isValid, isDirty },
	} = useForm<DeskLocationFormInputs>({
		defaultValues: deskLocation
			? {
					name: deskLocation.name,
					desk_location_type_id: deskLocation.desk_location_type_id,
					is_active: Boolean(deskLocation.is_active),
				}
			: {
					name: '',
					desk_location_type_id: selectedDeskLocationTypeId,
					is_active: true,
				},
		mode: 'onChange',
	});

	const deskLocationTypeId = watch('desk_location_type_id');

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewDeskLocationDialog();
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		try {
			if (isEditMode) {
				await updateLocation({
					id: deskLocation.id as unknown as number,
					params: {
						name: data.name,
						desk_location_type_id: data.desk_location_type_id!,
						is_active: data.is_active,
					},
				});
			} else {
				await createLocation({
					name: data.name,
					desk_location_type_id: data.desk_location_type_id!,
					is_active: data.is_active,
				});
			}

			handleClose();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title={isEditMode ? 'Edit Desk Location' : 'New Desk Location'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: onSubmit,
				icon: isEditMode ? undefined : <Send />,
				disabled: isSubmitting || isPending || !isValid || (isEditMode && !isDirty) || !deskLocationTypeId,
			}}
			onClose={handleClose}
			width={500}
		>
			<Stack width="100%" display="flex" alignItems="center" spacing={2}>
				<DeskLocationTypeSelect
					value={deskLocationTypeId}
					onChange={(newValue) => setValue('desk_location_type_id', newValue, { shouldDirty: true })}
					disabled={isSubmitting}
					required
				/>

				<Controller
					name="name"
					control={control}
					rules={{ required: 'Name is required', minLength: 2, maxLength: 255 }}
					render={({ field }) => (
						<TextField
							label="Name"
							
							placeholder="Desk location name"
							error={!!errors.name}
							helperText={errors.name?.message}
							{...field}
							disabled={isSubmitting}
							sx={styles.textFieldOverrides}
						/>
					)}
				/>

				<Controller
					name="is_active"
					control={control}
					render={({ field }) => (
						<FormControlLabel
							control={<Switch {...field} checked={field.value} disabled={isSubmitting} />}
							label="Active"
							sx={{ width: 400, fontSize: 13 }}
						/>
					)}
				/>
			</Stack>
		</BasicDialog>
	);
}

const styles = {
	textFieldOverrides: {
		width: 400,
		margin: '5px 0px',
		'& .MuiInputBase-root': {
			fontSize: 14,
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 14,
			padding: '5px',
		},
	},
};
