import { getSession } from '@/lib/auth/session';
import { db } from '@/api/database/kysely';

export async function createContext() {
	const session = await getSession();
	return { session, db };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
