'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import NewPassword, { NewPasswordFormInputs } from '@/components/auth/NewPassword';
import { Box, CircularProgress } from '@mui/material';

export default function ForceResetPasswordPage() {
	const router = useRouter();
	const { data: session, status } = useSession();
	const { mutateAsync: updateUser, isPending: isUpdating } = useUserTrpc().update;

	useEffect(() => {
		if (status === 'unauthenticated') {
			router.push('/unauthorized');
		}
	}, [status, router]);

	if (status === 'loading') {
		return (
			<Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
				<CircularProgress />
			</Box>
		);
	}

	if (!session?.user) {
		return null;
	}

	const onSubmit = async (data: NewPasswordFormInputs) => {
		await updateUser({
			id: session.user.id,
			params: {
				password: data.password,
				email_verified: new Date().toString(),
				must_change_password: false,
			},
		});
		signOut({ callbackUrl: '/login' });
	};

	return <NewPassword onSubmit={onSubmit} isResetting={isUpdating} />;
}
