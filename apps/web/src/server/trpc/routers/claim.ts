// apps/web/src/server/trpc/routers/claim.ts
import { router, publicProcedure } from '../trpc';

import { createClaim, getClaim, getClaims } from '@/api/controllers/claimController';
import { createClaimInput, getClaimInput, getClaimsInput } from '@/schemas/claimSchemas';

export const claimRouter = router({
	getClaim: publicProcedure.input(getClaimInput).query(async ({ input }) => {
		return getClaim(input);
	}),

	getClaims: publicProcedure.input(getClaimsInput).query(async ({ input }) => {
		return getClaims(input);
	}),

	createClaim: publicProcedure.input(createClaimInput).mutation(async ({ input }) => {
		return createClaim(input);
	}),
});
