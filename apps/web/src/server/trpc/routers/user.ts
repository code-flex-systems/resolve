import { t } from '../init';
import * as userController from '@/api/controllers/userController';
import { getUsersInput, getUserInput, createUserInput, updateUserInput, deleteUserInput } from '@/schemas/userSchemas';

export const userRouter = t.router({
	getUsers: t.procedure.input(getUsersInput).query(({ input }) => userController.getUsersController(input)),

	getUser: t.procedure.input(getUserInput).query(({ input }) => userController.getUserController(input)),

	createUser: t.procedure.input(createUserInput).mutation(({ input }) => userController.createUserController(input)),

	updateUser: t.procedure.input(updateUserInput).mutation(({ input }) => userController.updateUserController(input)),

	deleteUser: t.procedure.input(deleteUserInput).mutation(({ input }) => userController.deleteUserController(input)),
});
