import * as userController from '@/api/controllers/userController';
import { getUsersInput, getUserInput, createUsersInput, updateUserInput, deleteUserInput } from '@/schemas/userSchemas';
import { protectedProcedure, router } from '../trpc';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';

export const userRouter = router({
	getUsers: protectedProcedure.input(getUsersInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.getUsers(ctx, input);
	}),

	getUser: protectedProcedure.input(getUserInput).query(async ({ input, ctx }) => {
		userController.getUser(ctx, input);
	}),

	createUsers: protectedProcedure.input(createUsersInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return userController.createUsers(ctx, input);
	}),

	updateUser: protectedProcedure.input(updateUserInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		userController.updateUser(ctx, input);
	}),

	deleteUser: protectedProcedure.input(deleteUserInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		userController.deleteUser(ctx, input);
	}),
});
