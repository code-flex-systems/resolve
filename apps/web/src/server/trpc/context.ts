import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // your NextAuth config
import { NextApiRequest, NextApiResponse } from 'next';

export async function createContext(opts: { req: Request }) {
	const session = await getServerSession(authOptions); // ✅ Works in App Router
	return { session };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
