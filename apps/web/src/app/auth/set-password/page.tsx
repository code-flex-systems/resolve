'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc';
import styles from '../auth.module.css';

/**
 * Set/reset password page. Users land here from invite and password
 * recovery emails (after /auth/confirm establishes a session).
 */
export default function SetPasswordPage() {
	const router = useRouter();
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);
	const recordLogin = trpc.user.recordLogin.useMutation();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (password.length < 8) {
			setError('Password must be at least 8 characters');
			return;
		}
		if (password !== confirm) {
			setError('Passwords do not match');
			return;
		}

		setSubmitting(true);
		const supabase = createSupabaseBrowserClient();
		const { error: updateError } = await supabase.auth.updateUser({ password });

		if (updateError) {
			setError(updateError.message);
			setSubmitting(false);
			return;
		}

		// Record last_login + auth event (best effort - never block the flow)
		await recordLogin.mutateAsync().catch(() => {});

		router.replace('/');
		router.refresh();
	};

	return (
		<div className={styles.page}>
			<div className={styles.card}>
				<h1 className={styles.title}>Set your password</h1>
				<p className={styles.subtitle}>Choose a password to finish setting up your account.</p>

				{error && <div className={styles.errorMessage}>{error}</div>}

				<form onSubmit={handleSubmit} className={styles.form}>
					<Input
						id="new-password"
						label="New password"
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						fullWidth
						inputSize="lg"
						required
						autoComplete="new-password"
						autoFocus
					/>
					<Input
						id="confirm-password"
						label="Confirm password"
						type="password"
						value={confirm}
						onChange={(e) => setConfirm(e.target.value)}
						fullWidth
						inputSize="lg"
						required
						autoComplete="new-password"
					/>
					<Button type="submit" fullWidth loading={submitting}>
						Save password
					</Button>
				</form>
			</div>
		</div>
	);
}
