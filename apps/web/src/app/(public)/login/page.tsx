'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { Button, IconButton, InputAdornment, Link, TextField, Typography } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import AuthPageWrapper from '@/components/auth/AuthPageWrapper';

type LoginFormInputs = {
	username: string;
	password: string;
};

export default function LoginPage() {
	const router = useRouter();
	const [authError, setAuthError] = useState<string | null>(null);
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<LoginFormInputs>();
	const password = watch('password');

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
						error={!!errors.username?.message}
						helperText={errors.username?.message}
						sx={styles.textField}
						variant="outlined"
						{...register('username', { required: 'Username is required' })}
					/>
				</div>

				<div className="flex-row-left" style={{ padding: '10px 0px' }}>
					<TextField
						id="password"
						type={showPassword ? 'text' : 'password'}
						label="Password"
						error={!!errors.password}
						helperText={errors.password?.message}
						sx={styles.textField}
						variant="outlined"
						{...register('password', {
							required: 'Password is required',
							minLength: { value: 8, message: 'Minimum length is 8 characters' },
						})}
						slotProps={{
							input: {
								endAdornment: password && (
									<InputAdornment position="end" sx={{ margin: 0 }}>
										<IconButton
											size="small"
											disableRipple
											onClick={() => setShowPassword((prev) => !prev)}
										>
											{showPassword ? (
												<VisibilityOff sx={{ fontSize: 17 }} />
											) : (
												<Visibility sx={{ fontSize: 17 }} />
											)}
										</IconButton>
									</InputAdornment>
								),
							},
						}}
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

const styles = {
	textField: {
		width: 300,
		'& .MuiOutlinedInput-root': {
			paddingRight: '5px',
		},
		'& .MuiOutlinedInput-input': {
			padding: '5px 10px',
		},
	},
};
