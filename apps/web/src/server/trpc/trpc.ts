import { initTRPC, TRPCError } from '@trpc/server';
import { Context } from './context';
import { Session } from 'next-auth';

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export type ProtectedContext = Context & {
	session: {
		user: NonNullable<Session['user']>;
	};
};

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
	const session = ctx.session;

	if (!session?.user) {
		throw new TRPCError({ code: 'UNAUTHORIZED' });
	}

	const protectedCtx: ProtectedContext = {
		...ctx,
		session: { user: session.user, expires: session.expires },
	};

	return next({ ctx: protectedCtx });
});
