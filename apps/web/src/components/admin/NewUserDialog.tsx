'use client';

import { IconSend } from '@tabler/icons-react';
import Input from '@/components/ui/Input';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
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
				icon: <IconSend size={20} />,
				disabled: !email || isSubmitting || isPending,
			}}
			onClose={toggleNewUserDialog}
			width={475}
		>
			<span style={{ fontStyle: 'italic' }}>
				Enter the email address of the user you want to invite. They will receive an invitation email from Clerk
				to join your organization.
			</span>
			<span style={{ padding: '10px 0px', fontSize: 13, fontStyle: 'italic' }}>
				Once they accept the invitation, they will create their own account with their name and password.
			</span>
			<form>
				<div className="flex-row-left" style={styles.row}>
					<Input
						id="email"
						label="Email address"
						placeholder="user@example.com"
						error={!!errors.email}
						errorText={errors.email?.message}
						fullWidth
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
