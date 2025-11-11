'use client';

import { TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { DocGroupType } from '@/config/enums';

type CreateFolderFormInputs = {
	name: string;
	description?: string;
};

interface CreateFolderDialogProps {
	onClose: () => void;
	parentGroupId?: number | null;
}

export default function CreateFolderDialog({ onClose, parentGroupId = null }: CreateFolderDialogProps) {
	const { mutateAsync: createDocGroup, isPending } = useDocTrpc().createDocGroup;
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<CreateFolderFormInputs>();
	const name = watch('name');

	const onSubmit = handleSubmit(async (data) => {
		try {
			await createDocGroup({
				params: {
					name: data.name,
					description: data.description || undefined,
					parent_group_id: parentGroupId || undefined,
					group_type: DocGroupType.CUSTOM,
					sort_order: 0,
				},
			});
			onClose();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title="Create Folder"
			primaryAction={{
				label: 'Create',
				onClick: onSubmit,
				icon: <CreateNewFolderIcon />,
				disabled: !name || isSubmitting || isPending,
			}}
			onClose={onClose}
			width={450}
		>
			<Typography fontSize={13} mb={2}>
				Create a new folder to organize your documents.
			</Typography>
			<form>
				<TextField
					id="name"
					label="Folder Name"
					placeholder="e.g., Police Reports"
					fullWidth
					variant="outlined"
					error={!!errors.name}
					helperText={errors.name?.message}
					sx={{ ...styles.textFieldOverrides, mb: '20px' }}
					{...register('name', { required: 'Folder name is required' })}
				/>
				<TextField
					id="description"
					label="Description (optional)"
					placeholder="Brief description of this folder"
					fullWidth
					multiline
					rows={3}
					variant="outlined"
					error={!!errors.description}
					helperText={errors.description?.message}
					sx={styles.textFieldOverrides}
					{...register('description')}
				/>
			</form>
		</BasicDialog>
	);
}

const styles = {
	textFieldOverrides: {
		'& .MuiInputBase-root': {
			padding: '2px 5px',
		},
		'& .MuiOutlinedInput-input': {
			fontSize: 15,
			padding: '2px 5px',
		},
	},
};
