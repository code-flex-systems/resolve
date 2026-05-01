import { router, protectedProcedure } from '../trpc';
import {
	getCoverages,
	getCoveragesByClaimParty,
	createCoverage,
	updateCoverage,
	archiveCoverage,
	deleteCoverage,
} from '@/api/controllers/coverageController';
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
import {
	getCoveragesInput,
	getCoveragesByClaimPartyInput,
	createCoverageInput,
	updateCoverageInput,
	archiveCoverageInput,
	deleteCoverageInput,
} from '@/schemas/coverageSchemas';

export const coverageRouter = router({
	getCoverages: protectedProcedure.input(getCoveragesInput).query(async ({ input, ctx }) => {
		return getCoverages(ctx, input);
	}),

	getCoveragesByClaimParty: protectedProcedure
		.input(getCoveragesByClaimPartyInput)
		.query(async ({ input, ctx }) => {
			return getCoveragesByClaimParty(ctx, input);
		}),

	createCoverage: protectedProcedure.input(createCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createCoverage(ctx, input);
	}),

	updateCoverage: protectedProcedure.input(updateCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		const { id, ...params } = input;
		return updateCoverage(ctx, id, params);
	}),

	archiveCoverage: protectedProcedure
		.input(archiveCoverageInput)
		.mutation(async ({ input, ctx }) => {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
			return archiveCoverage(ctx, input.id);
		}),

	deleteCoverage: protectedProcedure.input(deleteCoverageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deleteCoverage(ctx, input.id);
	}),
});
