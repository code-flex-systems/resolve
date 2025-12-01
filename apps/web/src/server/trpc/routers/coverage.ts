import { router, protectedProcedure } from '../trpc';
import {
	getCoverages,
	createCoverage,
	updateCoverage,
	deleteCoverage,
} from '@/api/controllers/coverageController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	getCoveragesInput,
	createCoverageInput,
	updateCoverageInput,
	deleteCoverageInput,
} from '@/schemas/coverageSchemas';

export const coverageRouter = router({
	getCoverages: protectedProcedure.input(getCoveragesInput).query(async ({ input, ctx }) => {
		return getCoverages(ctx, input);
	}),

	createCoverage: protectedProcedure.input(createCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createCoverage(ctx, input);
	}),

	updateCoverage: protectedProcedure.input(updateCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return updateCoverage(ctx, input);
	}),

	deleteCoverage: protectedProcedure.input(deleteCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteCoverage(ctx, input);
	}),
});
