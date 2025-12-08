'use client';

import { useUser, useOrganization } from '@clerk/nextjs';
import { trpc } from '@/lib/trpc';
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
 * This hook combines Clerk's auth state with a server call to get the internal
 * user ID (UUID) from our database. This ensures queries always use the correct ID.
 *
 * Usage:
 * const { data: session, status } = useClerkSession();
 * if (status === 'loading') { ... }
 * if (status === 'unauthenticated') { ... }
 * const { id, name, email, role, client_id } = session.user;
 */
export function useClerkSession(): UseClerkSessionReturn {
	const { user, isLoaded: isUserLoaded, isSignedIn } = useUser();
	const { isLoaded: isOrgLoaded } = useOrganization();

	// Call the server to get the session with internal user ID
	// This does the DB lookup server-side and returns the correct UUID
	const { data: serverSession, isLoading: isServerLoading } = trpc.user.me.useQuery(undefined, {
		enabled: isSignedIn && isUserLoaded,
		staleTime: 5 * 60 * 1000, // Cache for 5 minutes
		refetchOnWindowFocus: false,
	});

	// Determine loading state
	const isLoading = !isUserLoaded || !isOrgLoaded || (isSignedIn && isServerLoading);

	if (isLoading) {
		return {
			data: null,
			status: 'loading',
			update: async () => {},
		};
	}

	if (!isSignedIn || !user) {
		return {
			data: null,
			status: 'unauthenticated',
			update: async () => {},
		};
	}

	// If server session is available, use it (has correct internal UUID)
	if (serverSession) {
		const session: AppSession = {
			user: serverSession,
		};

		return {
			data: session,
			status: 'authenticated',
			update: async () => {},
		};
	}

	// Fallback to Clerk data only (should rarely happen - only during initial load)
	const name = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
	const email = user.primaryEmailAddress?.emailAddress || null;
	const phone = user.primaryPhoneNumber?.phoneNumber || null;

	const session: AppSession = {
		user: {
			id: user.id, // Clerk ID as fallback
			clerkId: user.id,
			name,
			email,
			phone,
			role: null,
			client_id: null,
		},
	};

	return {
		data: session,
		status: 'authenticated',
		update: async () => {},
	};
}
