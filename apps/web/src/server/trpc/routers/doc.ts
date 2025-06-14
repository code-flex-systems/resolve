// apps/web/src/server/trpc/routers/doc.ts
import { router, protectedProcedure } from '../trpc';

import { createDoc, deleteDoc, getDoc, getDocs } from '@/api/controllers/docController';
import { createDocInput, deleteDocInput, getDocInput } from '@/schemas/docSchemas';

export const docRouter = router({
	getDocs: protectedProcedure.query(async ({ ctx }) => {
		return getDocs(ctx);
	}),

	getDoc: protectedProcedure.input(getDocInput).query(async ({ input, ctx }) => {
		return getDoc(ctx, input);
	}),

	createDoc: protectedProcedure.input(createDocInput).mutation(async ({ input, ctx }) => {
		return createDoc(ctx, input);
	}),

	deleteDoc: protectedProcedure.input(deleteDocInput).mutation(async ({ input, ctx }) => {
		return deleteDoc(ctx, input);
	}),
});
