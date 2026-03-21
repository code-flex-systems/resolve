import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type UserInput = RouterInput['user'];
type UserOutput = RouterOutput['user'];

export function useUserTrpc() {
	const utils = trpc.useUtils();

	return {
		/** Get current user's session data with internal UUID */
		me: trpc.user.me.useQuery,
		list: trpc.user.getUsers.useQuery,
		paginated: trpc.user.getUsersPaginated.useQuery,
		withDeskAssignments: trpc.user.getUsersWithDeskAssignments.useQuery,
		count: trpc.user.getUserCount.useQuery,
		countInactive: trpc.user.getInactiveUserCount.useQuery,
		get: trpc.user.getUser.useQuery,
		activity: trpc.user.getUserActivity.useQuery,
		activityDetail: trpc.user.getUserActivityDetail.useQuery,
		managementStats: trpc.user.getManagementStats.useQuery,

		create: trpc.user.createUsers.useMutation({
			onSuccess() {
				utils.user.getUsersPaginated.invalidate();
				utils.user.getUsersWithDeskAssignments.invalidate();
			},
		}),

		update: trpc.user.updateUser.useMutation({
			onSuccess(_, { id }) {
				utils.user.getUsersPaginated.invalidate();
				utils.user.getUsersWithDeskAssignments.invalidate();
				utils.user.getUser.invalidate({ id });
			},
		}),

		remove: trpc.user.deleteUser.useMutation({
			onSuccess() {
				utils.user.getUsersPaginated.invalidate();
				utils.user.getUsersWithDeskAssignments.invalidate();
			},
		}),
	};
}

export type GetUserOutput = UserOutput['getUsers'][number];
export type UpdateUserInput = UserInput['updateUser'];
