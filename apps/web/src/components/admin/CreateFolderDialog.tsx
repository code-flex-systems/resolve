'use client';

import { IconFolderPlus } from '@tabler/icons-react';
import Input, { Textarea } from '@/components/ui/Input';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import { useDocTrpc } from '@/hooks/trpc/useDocTrpc';
import { DocGroupType } from '@/config/enums';

type CreateFolderFormInputs = {
	name: string;
	description?: string;
};

interface CreateFolderDialogProps {
	onClose: () => void;
	parentGroupId?: string | null;
}

export default function CreateFolderDialog({
	onClose,
	parentGroupId = null,
}: CreateFolderDialogProps) {
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
				icon: <IconFolderPlus size={20} />,
				disabled: !name || isSubmitting || isPending,
			}}
			onClose={onClose}
			width={450}
		>
			<span style={{ fontSize: 13 }}>Create a new folder to organize your documents.</span>
			<form>
				<Input
					id="name"
					label="Folder Name"
					placeholder="e.g., Police Reports"
					fullWidth
					error={!!errors.name}
					errorText={errors.name?.message}
					style={{ marginBottom: 20 }}
					{...register('name', { required: 'Folder name is required' })}
				/>
				<Textarea
					id="description"
					label="Description (optional)"
					placeholder="Brief description of this folder"
					fullWidth
					rows={3}
					error={!!errors.description}
					errorText={errors.description?.message}
					{...register('description')}
				/>
			</form>
		</BasicDialog>
	);
}

const styles = {};
