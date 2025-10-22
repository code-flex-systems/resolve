import { trpc } from '@/lib/trpc';
import { AppRouter } from '@/server/trpc/appRouter';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

type UserInput = inferRouterInputs<AppRouter>['user'];
type UserOutput = inferRouterOutputs<AppRouter>['user'];

export function useUserTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.user.getUsers.useQuery,
		paginated: trpc.user.getUsersPaginated.useQuery,
		count: trpc.user.getUserCount.useQuery,
		countInactive: trpc.user.getInactiveUserCount.useQuery,
		get: trpc.user.getUser.useQuery,
		activity: trpc.user.getUserActivity.useQuery,
		activityDetail: trpc.user.getUserActivityDetail.useQuery,

		create: trpc.user.createUsers.useMutation({
			onSuccess() {
				utils.user.getUsersPaginated.invalidate();
			},
		}),

		update: trpc.user.updateUser.useMutation({
			onSuccess(_, { id }) {
				utils.user.getUsersPaginated.invalidate();
				utils.user.getUser.invalidate({ id });
			},
		}),

		remove: trpc.user.deleteUser.useMutation({
			onSuccess() {
				utils.user.getUsersPaginated.invalidate();
			},
		}),
	};
}

export type GetUserOutput = UserOutput['getUsers'][number];
export type UpdateUserInput = UserInput['updateUser'];
