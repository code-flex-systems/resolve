'use client';

import { createContext, useContext } from 'react';
import type { AppSession } from '@/lib/auth/session';

export type SessionStatus = 'loading' | 'authenticated' | 'unauthenticated';

export interface SessionContextValue {
	session: AppSession | null;
	status: SessionStatus;
	isAdmin: boolean;
	isSuperAdmin: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({
	children,
	session,
	isAdmin,
	isSuperAdmin,
	status = session ? 'authenticated' : 'unauthenticated',
}: {
	children: React.ReactNode;
	session: AppSession | null;
	isAdmin: boolean;
	isSuperAdmin: boolean;
	status?: SessionStatus;
}) {
	return (
		<SessionContext.Provider value={{ session, status, isAdmin, isSuperAdmin }}>
			{children}
		</SessionContext.Provider>
	);
}

export function useSessionContext() {
	const context = useContext(SessionContext);
	if (!context) {
		throw new Error('useSessionContext must be used within SessionProvider');
	}
	return context;
}
