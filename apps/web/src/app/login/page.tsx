'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import styles from '../auth/auth.module.css';

function LoginForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [error, setError] = useState<string | null>(
		searchParams.get('error') === 'invalid_link'
			? 'That link is invalid or has expired. Sign in or request a new one.'
			: null
	);
	const [info, setInfo] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const handleSignIn = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setInfo(null);
		setSubmitting(true);

		const supabase = createSupabaseBrowserClient();
		const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

		if (signInError) {
			setError(
				signInError.message === 'Invalid login credentials'
					? 'Invalid email or password'
					: signInError.message
			);
			setSubmitting(false);
			return;
		}

		router.replace('/');
		router.refresh();
	};

	const handleForgotPassword = async () => {
		setError(null);
		setInfo(null);

		if (!email) {
			setError('Enter your email address first, then click "Forgot password?"');
			return;
		}

		const supabase = createSupabaseBrowserClient();
		const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${window.location.origin}/auth/set-password`,
		});

		if (resetError) {
			setError(resetError.message);
			return;
		}

		setInfo('If an account exists for that email, a password reset link has been sent.');
	};

	return (
		<div className={styles.card}>
			<h1 className={styles.title}>Sign in</h1>
			<p className={styles.subtitle}>Welcome back. Enter your credentials to continue.</p>

			{error && <div className={styles.errorMessage}>{error}</div>}
			{info && <div className={styles.successMessage}>{info}</div>}

			<form onSubmit={handleSignIn} className={styles.form}>
				<Input
					id="email"
					label="Email"
					type="email"
					value={email}
					onChange={(e) => setEmail(e.target.value)}
					fullWidth
					inputSize="lg"
					required
					autoComplete="email"
					autoFocus
				/>
				<Input
					id="password"
					label="Password"
					type="password"
					value={password}
					onChange={(e) => setPassword(e.target.value)}
					fullWidth
					inputSize="lg"
					required
					autoComplete="current-password"
				/>
				<Button type="submit" fullWidth loading={submitting}>
					Sign in
				</Button>
			</form>

			<Button variant="text" size="sm" onClick={handleForgotPassword}>
				Forgot password?
			</Button>
		</div>
	);
}

export default function LoginPage() {
	return (
		<div className={styles.page}>
			<Suspense>
				<LoginForm />
			</Suspense>
		</div>
	);
}
