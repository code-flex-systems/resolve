import * as userController from '@/api/controllers/userController';
import {
	getUsersInput,
	getUserInput,
	createUsersInput,
	updateUserInput,
	deleteUserInput,
	getUserCountInput,
	getUserActivityInput,
	getUserActivityDetailInput,
	getUsersPaginatedInput,
} from '@/schemas/userSchemas';
import { protectedProcedure, router } from '../trpc';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import { checkRole } from '@/lib/auth/checkRole';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
	getUsers: protectedProcedure.input(getUsersInput).query(async ({ input, ctx }) => {
		return userController.getUsers(ctx, input);
	}),

	getInactiveUserCount: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.getInactiveUserCount(ctx);
	}),

	getUsersPaginated: protectedProcedure.input(getUsersPaginatedInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.getUsersPaginated(ctx, input);
	}),

	getUserActivity: protectedProcedure.input(getUserActivityInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.getUserActivity(ctx, input);
	}),

	getUserActivityDetail: protectedProcedure.input(getUserActivityDetailInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.getUserActivityDetail(ctx, input);
	}),

	getUserCount: protectedProcedure.input(getUserCountInput).query(async ({ input, ctx }) => {
		if (input.clientId) {
			// Client aliasing requires Super Admin role
			requireRole(ctx, config.ROLES.SUPER_ADMIN);
		} else {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		return await userController.getUserCount(ctx, { clientId: input.clientId ?? ctx.session.user.client_id! });
	}),

	getUser: protectedProcedure.input(getUserInput).query(async ({ input, ctx }) => {
		const user = await userController.getUser(ctx, input);
		if (!user) return null;

		const isAdmin = checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		const isSelf = input.id === ctx.session.user.id;

		// Admins and users viewing themselves get full profile
		if (isAdmin || isSelf) {
			return user;
		}

		// Contributors viewing other users only get basic fields (for assignment purposes)
		return {
			id: user.id,
			first: user.first,
			last: user.last,
			email: user.email,
			client_id: user.client_id,
		};
	}),

	createUsers: protectedProcedure.input(createUsersInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.createUsers(ctx, input);
	}),

	updateUser: protectedProcedure.input(updateUserInput).mutation(async ({ input, ctx }) => {
		const isAdmin = checkRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		const isSelfUpdate = input.id === ctx.session.user.id;

		// Must be admin to update other users
		if (!isSelfUpdate) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}

		// Contributors updating themselves cannot modify privileged fields
		if (isSelfUpdate && !isAdmin) {
			const privilegedFields: (keyof typeof input.params)[] = ['role', 'disabled', 'email_verified', 'phone_verified', 'must_change_password'];
			const hasPrivilegedField = privilegedFields.some(field => input.params[field] !== undefined);

			if (hasPrivilegedField) {
				throw new TRPCError({
					code: 'FORBIDDEN',
					message: 'Contributors cannot modify role, disabled status, or verification fields',
				});
			}
		}

		return userController.updateUser(ctx, input);
	}),

	deleteUser: protectedProcedure.input(deleteUserInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		userController.deleteUser(ctx, input);
	}),
});
