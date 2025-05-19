import { router, publicProcedure } from '../trpc';

import {
	createPage,
	createPageInstance,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstanceTree,
	getPageInstances,
	getVisiblePageInstances,
	modifyPage,
} from '@/api/controllers/pageController';
import {
	createPageInput,
	createPageInstanceInput,
	deletePageInstanceInput,
	getPageInput,
	getPageInstanceInput,
	getPageInstancesInput,
	getPageInstanceTreeInput,
	getVisiblePageInstancesInput,
	modifyPageInput,
} from '@/schemas/pageSchemas';

export const pageRouter = router({
	getPages: publicProcedure.query(async () => {
		return getPages();
	}),

	getPage: publicProcedure.input(getPageInput).query(async ({ input }) => {
		return getPage(input);
	}),

	getPageInstance: publicProcedure.input(getPageInstanceInput).query(async ({ input }) => {
		return getPageInstance(input);
	}),

	getPageInstances: publicProcedure.input(getPageInstancesInput).query(async ({ input }) => {
		return getPageInstances(input);
	}),

	getPageInstanceTree: publicProcedure.input(getPageInstanceTreeInput).query(async ({ input }) => {
		return getPageInstanceTree(input);
	}),

	getVisiblePageInstances: publicProcedure.input(getVisiblePageInstancesInput).query(async ({ input }) => {
		return getVisiblePageInstances(input);
	}),

	createPage: publicProcedure.input(createPageInput).mutation(async ({ input }) => {
		return createPage(input);
	}),

	createPageInstance: publicProcedure.input(createPageInstanceInput).mutation(async ({ input }) => {
		return createPageInstance(input);
	}),

	updatePageTemplate: publicProcedure.input(modifyPageInput).mutation(async ({ input }) => {
		return modifyPage(input);
	}),

	deletePageInstance: publicProcedure.input(deletePageInstanceInput).mutation(async ({ input }) => {
		return deletePageInstance(input);
	}),
});
