import { t } from '../init';
import * as userController from '@/api/controllers/userController';
import { getUsersInput, getUserInput, createUsersInput, updateUserInput, deleteUserInput } from '@/schemas/userSchemas';

export const userRouter = t.router({
	getUsers: t.procedure.input(getUsersInput).query(({ input }) => userController.getUsers(input)),

	getUser: t.procedure.input(getUserInput).query(({ input }) => userController.getUser(input)),

	createUsers: t.procedure.input(createUsersInput).mutation(({ input }) => userController.createUsers(input)),

	updateUser: t.procedure.input(updateUserInput).mutation(({ input }) => userController.updateUser(input)),

	deleteUser: t.procedure.input(deleteUserInput).mutation(({ input }) => userController.deleteUser(input)),
});
