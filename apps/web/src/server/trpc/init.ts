import { initTRPC } from '@trpc/server';
import { Context } from 'node:vm';
import superjson from 'superjson';

export const t = initTRPC.context<Context>().create({
	transformer: superjson,
	errorFormatter({ error }) {
		// all unhandled exceptions from your controllers land here
		console.error('🔴 tRPC error:', error);
		return { shape: error.shape };
	},
});
