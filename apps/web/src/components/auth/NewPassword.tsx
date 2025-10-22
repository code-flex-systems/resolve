'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
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
	const [showPassword, setShowPassword] = useState(false);
	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
		watch,
	} = useForm<NewPasswordFormInputs>();
	const password = watch('password');
	const passwordConfirmed = watch('confirm_password');

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
										<IconButton size="small" onClick={() => setShowPassword((prev) => !prev)}>
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

				<div className="flex-row-left" style={{ padding: '10px 0px' }}>
					<TextField
						id="confirm_password"
						type={showPassword ? 'text' : 'password'}
						label="Confirm Password"
						error={!!errors.password}
						helperText={errors.password?.message}
						sx={styles.textField}
						variant="outlined"
						slotProps={{
							input: {
								endAdornment: passwordConfirmed && (
									<InputAdornment position="end" sx={{ margin: 0 }}>
										<IconButton size="small" onClick={() => setShowPassword((prev) => !prev)}>
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
