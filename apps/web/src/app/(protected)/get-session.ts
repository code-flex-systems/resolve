import { redirect } from 'next/navigation';
import config from '@/config/config';
import { getClerkSession } from '@/lib/auth/clerk-session';
import type { AppSession } from '@/lib/auth/clerk-session';

export interface ProtectedSessionData {
	session: AppSession;
	isAdmin: boolean;
	isSuperAdmin: boolean;
}

export async function getProtectedSession(): Promise<ProtectedSessionData> {
	const session = await getClerkSession();
	if (!session) {
		redirect('/login');
	}

	const role = session.user.role;
	const isAdmin = role === config.ROLES.ADMIN;
	const isSuperAdmin = role === config.ROLES.SUPER_ADMIN;

	return { session, isAdmin, isSuperAdmin };
}
