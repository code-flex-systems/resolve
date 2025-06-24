'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Collapse, TextField, Typography } from '@mui/material';
import { Send } from '@mui/icons-material';
import AuthPageWrapper from '@/components/auth/AuthPageWrapper';
import { usePasswordResetTrpc } from '@/hooks/trpc/usePasswordResetTrpc';

export default function PasswordResetEmailPage() {
	const [errorMsg, setErrorMsg] = useState('');
	const [success, setSuccess] = useState(false);
	const { mutateAsync: requestPasswordReset } = usePasswordResetTrpc().request;
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<{ email: string }>();
	const email = watch('email');

	const onSubmit = handleSubmit(async (data: { email: string }) => {
		try {
			await requestPasswordReset({ email: data.email });
			setSuccess(true);
		} catch (e) {
			setErrorMsg('An error has occurred. Please try again.');
			console.error(e);
		}
	});

	return (
		<AuthPageWrapper title="Reset your password">
			<Typography fontSize={15} fontStyle="italic" color={success ? 'success' : ''} padding="5px 40px">
				{success
					? `An email has been sent to ${email}`
					: 'Please enter the email you have been assigned by your organization, and we will send you a link to reset your password.'}
			</Typography>

			<form style={{ width: '100%' }} className="flex-col-center" onSubmit={onSubmit} noValidate>
				<Collapse in={!success}>
					<div className="flex-row-left" style={{ padding: '10px 0px' }}>
						<TextField
							id="username"
							label="Username"
							type="email"
							placeholder="example@gmail.com"
							disabled={isSubmitting || success}
							error={!!errors.email?.message || !!errorMsg}
							helperText={errors.email?.message ?? errorMsg}
							sx={{
								width: 300,
							}}
							{...register('email', { required: 'Invalid email' })}
						/>
					</div>
				</Collapse>

				<Collapse in={!success}>
					<div className="flex-row-right" style={{ width: '100%' }}>
						<Button type="submit" disabled={isSubmitting} startIcon={<Send />}>
							{isSubmitting ? 'Sending...' : 'Send email'}
						</Button>
					</div>
				</Collapse>
			</form>
		</AuthPageWrapper>
	);
}
