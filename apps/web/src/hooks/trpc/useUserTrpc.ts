import { trpc } from '@/lib/trpc';

export function useUserTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.user.getUsers.useQuery,
		count: trpc.user.getUserCount.useQuery,
		get: trpc.user.getUser.useQuery,

		create: trpc.user.createUsers.useMutation({
			onSuccess() {
				utils.user.getUsers.invalidate();
			},
		}),

		update: trpc.user.updateUser.useMutation({
			onSuccess(_, { id }) {
				utils.user.getUsers.invalidate();
				utils.user.getUser.invalidate({ id });
			},
		}),

		remove: trpc.user.deleteUser.useMutation({
			onSuccess() {
				utils.user.getUsers.invalidate();
			},
		}),
	};
}
