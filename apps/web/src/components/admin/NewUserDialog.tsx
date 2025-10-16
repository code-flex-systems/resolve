'use client';

import { TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import { Send } from '@mui/icons-material';
import { useAdminStore } from '@/stores/useAdminStore';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';

type NewUserFormInputs = {
	first: string;
	last: string;
	email: string;
};

export default function NewUserDialog() {
	const toggleNewUserDialog = useAdminStore((state) => state.toggleNewUserDialog);
	const { mutateAsync: createUsers, isPending } = useUserTrpc().create;
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<NewUserFormInputs>();
	const email = watch('email');

	const onSubmit = handleSubmit(async (data) => {
		try {
			await createUsers({ users: [data] });
			toggleNewUserDialog();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title="New User"
			primaryAction={{
				label: 'Initiate account',
				onClick: onSubmit,
				icon: <Send />,
				disabled: !email || isSubmitting || isPending,
			}}
			onClose={toggleNewUserDialog}
			width={475}
		>
			<Typography fontStyle="italic" fontSize={13}>
				The new user will receive an email at the address you specify below. A default password will be created
				to allow the user one-time access.
			</Typography>
			<Typography padding="10px 0px" fontStyle="italic" fontSize={13}>
				Upon logging in with their email and the default password, they will be required to choose a new
				password.
			</Typography>
			<form>
				<div className="flex-row-left" style={styles.row}>
					<TextField
						id="first"
						label="First"
						placeholder="John"
						error={!!errors.first}
						helperText={errors.first?.message}
						sx={{
							width: 130,
							marginRight: '20px',
						}}
						{...register('first', { required: 'First name is required' })}
					/>
					<TextField
						id="last"
						label="Last"
						placeholder="Doe"
						error={!!errors.last}
						helperText={errors.last?.message}
						sx={{
							width: 200,
						}}
						{...register('last', { required: 'Last name is required' })}
					/>
				</div>
				<div className="flex-row-left" style={styles.row}>
					<TextField
						id="email"
						label="Organization email"
						placeholder="example@myorg.com"
						error={!!errors.email}
						helperText={errors.email?.message}
						sx={{
							width: 300,
						}}
						{...register('email', { required: 'Email is required' })}
					/>
				</div>
			</form>
		</BasicDialog>
	);
}

const styles = {
	row: {
		padding: '10px 0px',
	},
};
