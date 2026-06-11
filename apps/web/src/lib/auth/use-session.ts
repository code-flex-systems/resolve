'use client';

import { useSessionContext } from '@/app/(protected)/SessionProvider';
import type { AppSession } from './session';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface UseSessionReturn {
	data: AppSession | null;
	status: SessionStatus;
	update: () => Promise<void>;
}

/**
 * Client-side hook to get the current session
 * Provides API compatibility with the previous useSession() from next-auth
 *
 * This hook reads from the server-provided SessionProvider instead of
 * making a client-side request.
 */
export function useSession(): UseSessionReturn {
	const { session, status } = useSessionContext();

	return {
		data: session,
		status,
		update: async () => {},
	};
}
