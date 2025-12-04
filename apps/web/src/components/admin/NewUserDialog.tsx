'use client';

import { TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import Send from '@mui/icons-material/Send';
import { useAdminStore } from '@/stores/useAdminStore';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';

type InviteUserFormInputs = {
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
	} = useForm<InviteUserFormInputs>();
	const email = watch('email');

	const onSubmit = handleSubmit(async (data) => {
		try {
			await createUsers({ users: [{ email: data.email }] });
			toggleNewUserDialog();
		} catch (e) {
			console.error(e);
		}
	});

	return (
		<BasicDialog
			title="Invite User"
			primaryAction={{
				label: 'Send Invitation',
				onClick: onSubmit,
				icon: <Send />,
				disabled: !email || isSubmitting || isPending,
			}}
			onClose={toggleNewUserDialog}
			width={475}
		>
			<Typography fontStyle="italic" fontSize={13}>
				Enter the email address of the user you want to invite. They will receive an invitation email from Clerk
				to join your organization.
			</Typography>
			<Typography padding="10px 0px" fontStyle="italic" fontSize={13}>
				Once they accept the invitation, they will create their own account with their name and password.
			</Typography>
			<form>
				<div className="flex-row-left" style={styles.row}>
					<TextField
						id="email"
						label="Email address"
						placeholder="user@example.com"
						error={!!errors.email}
						helperText={errors.email?.message}
						sx={{
							width: '100%',
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
