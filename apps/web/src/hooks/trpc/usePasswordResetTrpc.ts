import { trpc } from '@/lib/trpc';

export function usePasswordResetTrpc() {
	const utils = trpc.useUtils();

	return {
		request: trpc.passwordReset.requestPasswordReset.useMutation(),

		validate: trpc.passwordReset.validateResetToken.useQuery,

		complete: trpc.passwordReset.completePasswordReset.useMutation(),

		invalidate: () => utils.passwordReset.validateResetToken.invalidate(),
	};
}
