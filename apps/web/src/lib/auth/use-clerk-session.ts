'use client';

import { useSessionContext } from '@/app/(protected)/SessionProvider';
import type { AppSession } from './clerk-session';

type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface UseClerkSessionReturn {
	data: AppSession | null;
	status: SessionStatus;
	update: () => Promise<void>;
}

/**
 * Client-side hook to get the current session
 * Provides API compatibility with the previous useSession() from next-auth
 *
 * This hook now reads from the server-provided SessionProvider instead of
 * making a client-side request.
 */
export function useClerkSession(): UseClerkSessionReturn {
	const { session, status } = useSessionContext();

	return {
		data: session,
		status,
		update: async () => {},
	};
}
