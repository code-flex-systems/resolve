'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Button, Paper, TextField, Typography } from '@mui/material';
import theme from '@/styles/theme';
import logo from '@/lib/resources/images/ChecklistLogo.png';
import Image from 'next/image';
import { formatPhoneNumber, validatePhoneNumber } from '@/lib/utils/utils';
import { MuiTelInput } from 'mui-tel-input';

type SignupFormInputs = {
	email: string;
	phone: string;
	password: string;
	password_confirmed: string;
	first: string;
	last: string;
};

export default function LoginPage() {
	const router = useRouter();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<SignupFormInputs>();
	const password = watch('password');

	const onSubmit = async (data: SignupFormInputs) => {
		setError(null);
		const res = await fetch('/api/auth/signup', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...data, phone: formatPhoneNumber(data.phone) }),
		});
		const body = await res.json();
		if (!res.ok) {
			setError(body.error || 'Signup failed');
			return;
		}

		const signInResult = await signIn('credentials', {
			redirect: false,
			username: data.email,
			password: data.password,
		});
		if (signInResult?.ok) {
			router.replace('/');
		} else {
			setError('Auto login failed');
		}
	};

	return (
		<div style={styles.container}>
			<Paper elevation={0} style={styles.paper}>
				<Paper style={styles.innerPaper}>
					<div style={{ width: '100%', height: 50 }} className="flex-row-center">
						<Image src={logo} alt="logo" height={30} />
						<Typography fontSize={25} marginLeft="10px" color="primary">
							Create your account
						</Typography>
					</div>

					<form
						style={{ width: '100%' }}
						className="flex-col-center"
						onSubmit={handleSubmit(onSubmit)}
						noValidate
					>
						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<TextField
								id="first"
								label="First"
								placeholder="John"
								error={!!errors.first}
								helperText={errors.first?.message}
								sx={{
									width: 300,
								}}
								{...register('first', { required: 'First name is required' })}
							/>
						</div>
						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<TextField
								id="last"
								label="Last"
								placeholder="Doe"
								error={!!errors.last}
								helperText={errors.last?.message}
								sx={{
									width: 300,
								}}
								{...register('last', { required: 'Last name is required' })}
							/>
						</div>
						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<TextField
								id="email"
								label="Email"
								placeholder="example@gmail.com"
								error={!!errors.email}
								helperText={errors.email?.message}
								sx={{
									width: 300,
								}}
								{...register('email', { required: 'Email is required' })}
							/>
						</div>
						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<TextField
								id="phone"
								label="Phone number"
								type="tel"
								error={!!errors.phone}
								helperText={errors.phone?.message}
								sx={{
									width: 300,
								}}
								{...register('phone', {
									required: 'Phone number is required',
									validate: validatePhoneNumber,
								})}
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
						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<TextField
								id="password_confirmed"
								type="password"
								label="Confirm password"
								error={!!errors.password_confirmed}
								helperText={errors.password_confirmed?.message}
								sx={{
									width: 300,
								}}
								{...register('password_confirmed', {
									required: 'Passwords must match',
									validate: (value) => (password === value ? undefined : 'Passwords must match'),
								})}
							/>
						</div>

						{error && <Typography color="error">{error}</Typography>}

						<div className="flex-row-right" style={{ width: '100%' }}>
							<Button href="/login" disabled={isSubmitting} sx={{ marginRight: '5px' }}>
								Back
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Creating...' : 'Create'}
							</Button>
						</div>
					</form>
				</Paper>
			</Paper>
		</div>
	);
}

const styles = {
	container: {
		width: '100vw',
		height: '100vh',
	},
	innerPaper: {
		width: 600,
		height: 'fit-content',
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	paper: {
		width: '100vw',
		height: '100vh',
		backgroundColor: theme.palette.primary.main,
		display: 'flex',
		flexDirection: 'column' as const,
		justifyContent: 'center',
		alignItems: 'center',
	},
};
