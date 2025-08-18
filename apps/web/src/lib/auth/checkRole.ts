import { TRPCError } from '@trpc/server';
import type { Context } from '@/server/trpc/context';
import { Role } from '@/types/types';

export function checkRole(ctx: Context, checkedRole: Role | Role[]) {
	const checkedRoles = Array.isArray(checkedRole) ? checkedRole : [checkedRole];
	const userRole = ctx.session?.user?.role;

	if (!userRole) {
		throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User is not authenticated.' });
	}

	return checkedRoles.includes(userRole as Role);
}
