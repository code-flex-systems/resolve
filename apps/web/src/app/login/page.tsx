'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Button, Link, Paper, TextField, Typography } from '@mui/material';
import theme from '@/styles/theme';
import logo from '@/lib/resources/images/ChecklistLogo.png';
import Image from 'next/image';

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
		<div style={styles.container}>
			<Paper elevation={0} style={styles.paper}>
				<Paper style={styles.innerPaper}>
					<div style={{ width: '100%', height: 50 }} className="flex-row-center">
						<Image src={logo} alt="logo" height={30} />
						<Typography fontSize={25} marginLeft="10px" color="primary">
							Welcome to Manifest!
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

						<div className="flex-row-left" style={{ padding: '10px 0px' }}>
							<Typography>
								Don’t have an account? <Link href="/signup">Create account</Link>
							</Typography>
						</div>

						<div className="flex-row-right" style={{ width: '100%' }}>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting ? 'Signing in...' : 'Sign In'}
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
