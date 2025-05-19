// apps/web/src/server/trpc/routers/doc.ts
import { router, publicProcedure } from '../trpc';

import { createDoc, deleteDoc, getDoc, getDocs } from '@/api/controllers/docController';
import { createDocInput, deleteDocInput, getDocInput } from '@/schemas/docSchemas';

export const docRouter = router({
	getDocs: publicProcedure.query(async () => {
		return getDocs();
	}),

	getDoc: publicProcedure.input(getDocInput).query(async ({ input }) => {
		return getDoc(input);
	}),

	createDoc: publicProcedure.input(createDocInput).mutation(async ({ input }) => {
		return createDoc(input);
	}),

	deleteDoc: publicProcedure.input(deleteDocInput).mutation(async ({ input }) => {
		return deleteDoc(input);
	}),
});
