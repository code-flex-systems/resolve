import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { Context } from './context';
import type { AppSession } from '@/lib/auth/session';

const t = initTRPC.context<Context>().create({
	transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export type ProtectedContext = Context & {
	session: AppSession;
};

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	const session = ctx.session;

	if (!session?.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}

	// Force non-null typing for session
	const protectedCtx: ProtectedContext = {
		...ctx,
		session: { user: session.user },
	};

	return next({ ctx: protectedCtx });
});
