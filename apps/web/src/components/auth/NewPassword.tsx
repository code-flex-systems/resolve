'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, TextField, Typography } from '@mui/material';
import AuthPageWrapper from './AuthPageWrapper';

export type NewPasswordFormInputs = {
	password: string;
	confirm_password: string;
};

export default function NewPassword(props: {
	onSubmit: (data: NewPasswordFormInputs) => Promise<void>;
	isResetting: boolean;
}) {
	const [authError, setAuthError] = useState<string | null>(null);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<NewPasswordFormInputs>();
	const password = watch('password');

	const onSubmit = handleSubmit(async (data: NewPasswordFormInputs) => {
		try {
			await props.onSubmit(data);
		} catch (e) {
			setAuthError('An error has occurred. Please try again.');
			console.error(e);
		}
	});

	return (
		<AuthPageWrapper title="Choose a new password">
			<form style={{ width: '100%' }} className="flex-col-center" onSubmit={onSubmit} noValidate>
				<div className="flex-row-left" style={{ padding: '10px 0px' }}>
					<TextField
						id="password"
						type="password"
						label="Password"
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

				<div className="flex-row-left" style={{ padding: '10px 0px' }}>
					<TextField
						id="confirm_password"
						type="password"
						label="Confirm Password"
						error={!!errors.password}
						helperText={errors.password?.message}
						sx={{
							width: 300,
						}}
						{...register('confirm_password', {
							required: 'Please retype your password',
							validate: (v) => (v !== password ? 'Passwords do not match' : undefined),
						})}
					/>
				</div>

				{authError && <Typography color="error">{authError}</Typography>}

				<div className="flex-row-right" style={{ width: '100%' }}>
					<Button type="submit" disabled={isSubmitting || props.isResetting}>
						{isSubmitting || props.isResetting ? 'Saving...' : 'Save Password'}
					</Button>
				</div>
			</form>
		</AuthPageWrapper>
	);
}
