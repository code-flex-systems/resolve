import { getClerkSession } from '@/lib/auth/clerk-session';
import { db } from '@/api/database/kysely';

export async function createContext() {
	const session = await getClerkSession();
	return { session, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
