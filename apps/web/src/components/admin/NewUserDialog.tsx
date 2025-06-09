import { TextField, Typography } from '@mui/material';
import BasicDialog from '../common/BasicDialog';
import { useForm } from 'react-hook-form';
import { Send } from '@mui/icons-material';
import { toggleNewUserDialog } from '@/state/admin/actions';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';

type NewUserFormInputs = {
	first: string;
	last: string;
	email: string;
	password: string;
};

export default function NewUserDialog() {
	const { mutate: createUsers, isPending } = useUserTrpc().create;
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<NewUserFormInputs>({
		defaultValues: {
			password: process.env.DEFAULT_WEB_PW,
		},
	});
	const email = watch('email');
	const password = watch('password');

	const onSubmit = handleSubmit((data) => createUsers({ users: [data] }));

	return (
		<BasicDialog
			title="New User"
			primaryAction={{
				label: 'Initiate account',
				onClick: onSubmit,
				icon: <Send />,
				disabled: !email || !password || isSubmitting || isPending,
			}}
			onClose={toggleNewUserDialog}
			width={475}
		>
			<Typography fontStyle="italic" fontSize={13}>
				The new user will receive an email at the address you specify below. A default password will be created
				to allow the user one-time access.
			</Typography>
			<Typography padding="10px 0px" fontStyle="italic" fontSize={13}>
				Upon logging in with their email and the default password, they will be required to pick a new password.
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
				<div className="flex-row-left" style={styles.row}>
					<TextField
						id="password"
						label="Default password"
						error={!!errors.password}
						helperText={errors.password?.message}
						sx={{
							width: 300,
						}}
						{...register('password', {
							required: 'Password is required',
							minLength: { value: 8, message: 'Minimum length is 8 characters' },
						})}
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
