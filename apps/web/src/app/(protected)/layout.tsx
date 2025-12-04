'use client';

import AlertContainer from '@/components/common/AlertContainer';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	// Clerk handles password reset flows automatically
	return (
		<>
			<AlertContainer />
			{children}
		</>
	);
}
