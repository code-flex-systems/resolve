'use client';

import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useUserTrpc } from '@/hooks/trpc/useUserTrpc';
import NewPassword, { NewPasswordFormInputs } from '@/components/auth/NewPassword';

export default function ForceResetPasswordPage() {
	const router = useRouter();
	const { data: session } = useSession();
	const { mutateAsync: updateUser, isPending: isUpdating } = useUserTrpc().update;

	if (!session?.user) {
		router.push('/unauthorized');
		return <></>;
	}

	const onSubmit = async (data: NewPasswordFormInputs) => {
		await updateUser({
			id: session.user.id,
			params: { password: data.password, must_change_password: false },
		});
		signOut({ callbackUrl: '/login' });
	};

	return <NewPassword onSubmit={onSubmit} isResetting={isUpdating} />;
}
