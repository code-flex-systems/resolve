'use client';

import { IconFileSearch } from '@tabler/icons-react';
import { FormLabel } from '@mui/material';
import Dropdown from '@/components/ui/Dropdown';
import Input from '@/components/ui/Input';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import { useAdminStore } from '@/stores/useAdminStore';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useRouter } from 'next/navigation';
import { useCrudAlerts } from '@/hooks/useCrudAlerts';

type NewChecklistFormInputs = {
	name: string;
	from: string;
};

export default function NewChecklistDialog() {
	const router = useRouter();
	const toggleNewChecklistDialog = useAdminStore((state) => state.toggleNewChecklistDialog);
	const { data: checklists = [], isPending: loadingChecklists } = useChecklistTrpc().list({});
	const { mutateAsync: createChecklist, isPending } = useChecklistTrpc().create;
	const { showSuccess, showError } = useCrudAlerts('checklist');
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<NewChecklistFormInputs>();
	const name = watch('name');

	const onSubmit = handleSubmit(async (data) => {
		try {
			const newChecklist = await createChecklist({
				name: data.name,
				existingChecklistId: typeof data.from === 'number' ? data.from : undefined,
			});
			showSuccess('create', 'Checklist created');
			router.push(`/checklist/${newChecklist.id}`);
		} catch (e) {
			showError('create', e, 'Failed to create checklist');
		}
	});

	return (
		<BasicDialog
			title="New Checklist"
			primaryAction={{
				label: 'Create checklist',
				onClick: onSubmit,
				icon: <IconFileSearch size={20} />,
				disabled: !name || isPending || isSubmitting,
			}}
			onClose={toggleNewChecklistDialog}
			width={475}
		>
			<span style={{ fontStyle: 'italic' }}>
				The new checklist will be unpublished by default.
			</span>
			<span style={{ fontStyle: 'italic' }}>
				This gives you a chance to finalize pages, questions, and answers before making it available to users.
			</span>
			<form>
				<div className="flex-row-left" style={styles.row}>
					<Input
						id="name"
						label="Name"
						placeholder="Master Checklist"
						error={!!errors.name}
						errorText={errors.name?.message}
						style={{ width: 300 }}
						{...register('name', { required: 'Checklist name is required' })}
					/>
				</div>
				<div className="flex-row-left" style={styles.row}>
					<div>
						<FormLabel style={styles.formLabel}>Choose a checklist to copy from (optional)</FormLabel>
						<Dropdown
							options={[
								{ value: '', label: 'None' },
								...checklists.map((o) => ({
									value: o.id,
									label: o.name,
								})),
							]}
							value={(watch('from') as any) ?? ''}
							onChange={(v) => {
								const event = { target: { name: 'from', value: v } };
								register('from').onChange(event as any);
							}}
							disabled={loadingChecklists}
							placeholder={loadingChecklists ? 'Loading...' : 'Select'}
						/>
					</div>
				</div>
			</form>
		</BasicDialog>
	);
}

const styles = {
	formLabel: {
		fontSize: 12,
		paddingBottom: '5px',
	},
	row: {
		padding: '10px 0px',
	},
	textFieldOverrides: {
		width: 300,
		},
};
