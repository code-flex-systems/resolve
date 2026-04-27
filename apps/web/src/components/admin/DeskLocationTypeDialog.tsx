'use client';

import { IconSend } from '@tabler/icons-react';
import Input from '@/components/ui/Input';
import Checkbox from '@/components/ui/Checkbox';
import BasicDialog from '../common/BasicDialog';
import { Controller, useForm } from 'react-hook-form';
import { useDeskTrpc } from '@/hooks/trpc/useDeskTrpc';
import { useAdminStore } from '@/stores/useAdminStore';
import type { DeskLocationType } from '@/api/database/types';

interface DeskLocationTypeFormInputs {
	name: string;
	createDefaultLocations: boolean;
}

interface DeskLocationTypeDialogProps {
	deskType?: DeskLocationType;
	onClose?: () => void;
}

export default function DeskLocationTypeDialog({ deskType, onClose }: DeskLocationTypeDialogProps) {
	// Accept both prop names for backward compatibility
	const deskLocationType = deskType;
	const toggleNewDeskLocationTypeDialog = useAdminStore((state) => state.toggleNewDeskLocationTypeDialog);
	const deskTrpc = useDeskTrpc();
	const { mutateAsync: createType, isPending: creating } = deskTrpc.createType;
	const { mutateAsync: updateType, isPending: updating } = deskTrpc.updateType;

	const isEditMode = !!deskLocationType;
	const isPending = creating || updating;

	const {
		control,
		handleSubmit,
		formState: { errors, isSubmitting, isValid, isDirty },
	} = useForm<DeskLocationTypeFormInputs>({
		defaultValues: deskLocationType
			? {
					name: deskLocationType.name,
					createDefaultLocations: false,
				}
			: {
					name: '',
					createDefaultLocations: false,
				},
		mode: 'onChange',
	});

	const handleClose = () => {
		if (onClose) {
			onClose();
		} else {
			toggleNewDeskLocationTypeDialog();
		}
	};

	const onSubmit = handleSubmit(async (data) => {
		try {
			if (isEditMode) {
				await updateType({
					id: String(deskLocationType.id),
					params: {
						name: data.name,
					},
				});
			} else {
				await createType({
					name: data.name,
					createDefaultLocations: data.createDefaultLocations,
				});
			}

			handleClose();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title={isEditMode ? 'Edit Desk Location Type' : 'New Desk Location Type'}
			primaryAction={{
				label: isEditMode ? 'Update' : 'Create',
				onClick: onSubmit,
				icon: isEditMode ? undefined : <IconSend size={20} />,
				disabled: isSubmitting || isPending || !isValid || (isEditMode && !isDirty),
			}}
			onClose={handleClose}
			width={500}
		>
			<div style={{ width: '100%', display: 'flex', alignItems: 'center', flexDirection: 'column', gap: 16 }}>
				<Controller
					name="name"
					control={control}
					rules={{ required: 'Name is required', minLength: 2, maxLength: 255 }}
					render={({ field }) => (
						<Input
							label="Name"
							placeholder="Desk location type name"
							error={!!errors.name}
							errorText={errors.name?.message}
							{...field}
							disabled={isSubmitting}
							style={styles.textFieldOverrides}
						/>
					)}
				/>

				{!isEditMode && (
					<Controller
						name="createDefaultLocations"
						control={control}
						render={({ field }) => (
							<div style={{ width: 400 }}>
								<Checkbox checked={field.value} onChange={(checked) => field.onChange(checked)} disabled={isSubmitting} label="Create default desk locations (Pending, Transactional, Closed, etc.)" />
							</div>
						)}
					/>
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
