'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Button, Link, TextField, Typography } from '@mui/material';
import AuthPageWrapper from '@/components/auth/AuthPageWrapper';

type LoginFormInputs = {
	username: string;
	password: string;
};

export default function LoginPage() {
	const router = useRouter();
	const [authError, setAuthError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginFormInputs>();

	const onSubmit = async (data: LoginFormInputs) => {
		setAuthError(null);
		let result;
		try {
			result = await signIn('credentials', {
				redirect: false,
				username: data.username,
				password: data.password,
				callbackUrl: '/',
			});
               } catch {
                       setAuthError('Invalid username or password');
               }
		if (result?.error) {
			setAuthError('Invalid username or password');
		} else {
			router.replace(result?.url || '/');
		}
	};

	return (
		<AuthPageWrapper title="Welcome to Manifest!" showLogo>
			<form style={{ width: '100%' }} className="flex-col-center" onSubmit={handleSubmit(onSubmit)} noValidate>
				<div className="flex-row-left" style={{ padding: '10px 0px' }}>
					<TextField
						id="username"
						label="Username"
						placeholder="example@gmail.com"
						error={!!errors.username?.message}
						helperText={errors.username?.message}
						sx={{
							width: 300,
						}}
						{...register('username', { required: 'Username is required' })}
					/>
				</div>

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

				{authError && <Typography color="error">{authError}</Typography>}

				<div style={{ padding: '10px 0px' }}>
					<Link href="/reset-password-email">Forgot password</Link>
				</div>

				<div className="flex-row-right" style={{ width: '100%' }}>
					<Button type="submit" disabled={isSubmitting}>
						{isSubmitting ? 'Signing in...' : 'Sign In'}
					</Button>
				</div>
			</form>
		</AuthPageWrapper>
	);
}
