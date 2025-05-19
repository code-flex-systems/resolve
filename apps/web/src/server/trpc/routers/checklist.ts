// apps/web/src/server/trpc/routers/checklist.ts
import { router, publicProcedure } from '../trpc';
import z from 'zod';

import {
	getChecklists,
	getChecklist,
	getChecklistClaim,
	getRecentChecklistClaims,
	getChecklistSummary,
	getChecklistSummaryDetail,
	createChecklist,
	deleteChecklist,
	modifyChecklist,
} from '@/api/controllers/checklistController'; // Adjust path if needed
import {
	createChecklistInput,
	deleteChecklistInput,
	getChecklistClaimInput,
	getChecklistInput,
	getChecklistsInput,
	getChecklistSummaryDetailInput,
	getChecklistSummaryInput,
	modifyChecklistInput,
} from '@/schemas/checklistSchemas';

export const checklistRouter = router({
	getChecklists: publicProcedure.input(getChecklistsInput).query(async ({ input }) => {
		return await getChecklists(input);
	}),

	getChecklist: publicProcedure.input(getChecklistInput).query(async ({ input }) => {
		return await getChecklist(input);
	}),

	getChecklistClaim: publicProcedure.input(getChecklistClaimInput).query(async ({ input }) => {
		return await getChecklistClaim(input);
	}),

	getRecentChecklistClaims: publicProcedure.query(async () => {
		return await getRecentChecklistClaims();
	}),

	getChecklistSummary: publicProcedure.input(getChecklistSummaryInput).query(async ({ input }) => {
		return await getChecklistSummary(input);
	}),

	getChecklistSummaryDetail: publicProcedure.input(getChecklistSummaryDetailInput).query(async ({ input }) => {
		return await getChecklistSummaryDetail(input);
	}),

	createChecklist: publicProcedure.input(createChecklistInput).mutation(async ({ input }) => {
		return await createChecklist(input);
	}),

	deleteChecklist: publicProcedure.input(deleteChecklistInput).mutation(async ({ input }) => {
		return await deleteChecklist(input);
	}),

	updateChecklist: publicProcedure.input(modifyChecklistInput).mutation(async ({ input }) => {
		return modifyChecklist(input);
	}),
});
