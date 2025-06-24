'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

const FORCE_PATH = '/force-password-reset';

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
	const { data: session, status } = useSession();
	const router = useRouter();
	const pathname = usePathname();

	useEffect(() => {
		if (status === 'authenticated' && session.user?.must_change_password && pathname !== FORCE_PATH) {
			router.replace(FORCE_PATH);
		}
	}, [session, status, pathname, router]);

	return children;
}
