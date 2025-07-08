'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import NewPassword, { NewPasswordFormInputs } from '@/components/auth/NewPassword';
import { useEffect } from 'react';
import { usePasswordResetTrpc } from '@/hooks/trpc/usePasswordResetTrpc';
import AuthPageWrapper from '@/components/auth/AuthPageWrapper';
import { Typography } from '@mui/material';
import { LineWobble } from 'ldrs/react';
import theme from '@/styles/theme';
import 'ldrs/react/LineWobble.css';

export default function ResetPassword() {
	const searchParams = useSearchParams();
	const token = searchParams.get('token');
	const router = useRouter();
	const { data, isFetching: isValidating } = usePasswordResetTrpc().validate({ token: token ?? '' });
	const { mutateAsync: completePasswordReset, isPending: isResetting } = usePasswordResetTrpc().complete;

	useEffect(() => {
		if (!token) router.push('/unauthorized');
	}, [token, router]);

	const onSubmit = async (data: NewPasswordFormInputs) => {
		try {
			await completePasswordReset({ token: token!, password: data.password });
			router.push('/login');
		} catch (e) {
			console.error(e);
		}
	};

	return isValidating || !data ? (
		<AuthPageWrapper title={isValidating ? 'Please wait' : 'Token Expired'}>
			{isValidating ? (
				<LineWobble size="200" stroke="5" bgOpacity="0.1" speed="2" color={theme.palette.primary.main} />
			) : (
				<Typography fontStyle="italic" fontSize={15} color="error">
					The token is invalid or has expired. Please try again with a new link.
				</Typography>
			)}
		</AuthPageWrapper>
	) : (
		<NewPassword onSubmit={onSubmit} isResetting={isResetting} />
	);
}
