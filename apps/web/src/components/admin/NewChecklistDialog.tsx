'use client';

import { FormControl, FormLabel, MenuItem, Select, TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import ContentPasteSearch from '@mui/icons-material/ContentPasteSearch';
import { useAdminStore } from '@/stores/useAdminStore';
import { useChecklistTrpc } from '@/hooks/trpc/useChecklistTrpc';
import { useRouter } from 'next/navigation';

type NewChecklistFormInputs = {
	name: string;
	from: string;
};

export default function NewChecklistDialog() {
	const router = useRouter();
	const toggleNewChecklistDialog = useAdminStore((state) => state.toggleNewChecklistDialog);
	const { data: checklists = [], isPending: loadingChecklists } = useChecklistTrpc().list({});
	const { mutateAsync: createChecklist, isPending } = useChecklistTrpc().create;
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
			router.push(`/checklist/${newChecklist.id}`);
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title="New Checklist"
			primaryAction={{
				label: 'Create checklist',
				onClick: onSubmit,
				icon: <ContentPasteSearch />,
				disabled: !name || isPending || isSubmitting,
			}}
			onClose={toggleNewChecklistDialog}
			width={475}
		>
			<Typography fontStyle="italic" fontSize={13}>
				The new checklist will be unpublished by default.
			</Typography>
			<Typography fontStyle="italic" fontSize={13} paddingTop="10px">
				This gives you a chance to finalize pages, questions, and answers before making it available to users.
			</Typography>
			<form>
				<div className="flex-row-left" style={styles.row}>
					<TextField
						id="name"
						label="Name"
						placeholder="Master Checklist"
						error={!!errors.name}
						helperText={errors.name?.message}
						sx={{ width: 300 }}
						{...register('name', { required: 'Checklist name is required' })}
					/>
				</div>
				<div className="flex-row-left" style={styles.row}>
					<FormControl>
						<FormLabel sx={styles.formLabel}>Choose a checklist to copy from (optional)</FormLabel>
						<Select
							variant="outlined"
							displayEmpty
							{...register('from')}
							renderValue={(value) => {
								if (value) return checklists.find((c) => c.id === value)?.name ?? '';
								if (value != null) return 'None';
								return loadingChecklists ? 'Loading...' : 'Select';
							}}
							sx={styles.textFieldOverrides}
							disabled={loadingChecklists}
						>
							<MenuItem key="none" value={''}>
								<i>None</i>
							</MenuItem>
							{checklists.map((o) => (
								<MenuItem key={o.id} value={o.id}>
									{o.name}
								</MenuItem>
							))}
						</Select>
					</FormControl>
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
		'& .MuiInputBase-root': {
			padding: '3px 5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '3px 5px',
		},
	},
};
