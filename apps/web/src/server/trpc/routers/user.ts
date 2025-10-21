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
		userController.getUser(ctx, input);
	}),

	createUsers: protectedProcedure.input(createUsersInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.createUsers(ctx, input);
	}),

	updateUser: protectedProcedure.input(updateUserInput).mutation(async ({ input, ctx }) => {
		// A user may update their own metadata or password
		if (input.id !== ctx.session.user.id) {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		userController.updateUser(ctx, input);
	}),

	deleteUser: protectedProcedure.input(deleteUserInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		userController.deleteUser(ctx, input);
	}),
});
