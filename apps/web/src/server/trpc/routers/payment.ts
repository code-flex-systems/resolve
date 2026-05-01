import { router, protectedProcedure } from '../trpc';
import {
	createPayment,
	listPayments,
	updatePayment,
	archivePayment,
} from '@/api/controllers/paymentController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	createPaymentInput,
	updatePaymentInput,
	archivePaymentInput,
	listPaymentsInput,
} from '@/schemas/paymentSchemas';

export const paymentRouter = router({
	// =====================================================================
	// CLAIM PAYMENT ENDPOINTS
	// =====================================================================

	createPayment: protectedProcedure.input(createPaymentInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createPayment(ctx, input);
	}),

	listPayments: protectedProcedure.input(listPaymentsInput).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return listPayments(ctx, input);
	}),

	updatePayment: protectedProcedure.input(updatePaymentInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return updatePayment(ctx, input);
	}),

	archivePayment: protectedProcedure.input(archivePaymentInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return archivePayment(ctx, input);
	}),
});
