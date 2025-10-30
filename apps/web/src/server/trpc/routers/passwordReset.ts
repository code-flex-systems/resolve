import { publicProcedure, router } from '@/server/trpc/trpc';
import {
	RequestPasswordResetSchema,
	ValidateResetTokenSchema,
	CompletePasswordResetSchema,
} from '@/schemas/passwordResetSchemas';
import {
	requestPasswordReset,
	validateResetToken,
	completePasswordReset,
} from '@/api/controllers/passwordResetController';

export const passwordResetRouter = router({
	requestPasswordReset: publicProcedure.input(RequestPasswordResetSchema).mutation(async ({ ctx, input }) => {
		return requestPasswordReset(ctx, input);
	}),

	validateResetToken: publicProcedure.input(ValidateResetTokenSchema).query(async ({ ctx, input }) => {
		return validateResetToken(ctx, input);
	}),

	completePasswordReset: publicProcedure.input(CompletePasswordResetSchema).mutation(async ({ ctx, input }) => {
		return completePasswordReset(ctx, input);
	}),
});
