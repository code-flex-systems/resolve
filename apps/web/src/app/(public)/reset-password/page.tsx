import ResetPassword from '@/components/auth/ResetPassword';
import { Suspense } from 'react';

export default function ResetPasswordPage() {
	return (
		<Suspense fallback={<div>Waiting...</div>}>
			<ResetPassword />
		</Suspense>
	);
}
