import { TRPCError } from '@trpc/server';
import type { Context } from '@/server/trpc/context';
import { Role } from '@/types/types';

export function requireRole(ctx: Context, requiredRole: Role | Role[]) {
	const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
	const userRole = ctx.session?.user?.role;

	if (!userRole) {
		throw new TRPCError({ code: 'UNAUTHORIZED', message: 'User is not authenticated.' });
	}

	if (!requiredRoles.includes(userRole as Role)) {
		throw new TRPCError({
			code: 'FORBIDDEN',
			message: `User must have one of: ${requiredRoles.join(', ')}`,
		});
	}

	return true;
}
