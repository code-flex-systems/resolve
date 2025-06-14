import { router, protectedProcedure } from '../trpc';

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
import config from '@/config/config';
import { requireRole } from '@/lib/auth/requireRole';
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
	getPages: protectedProcedure.query(async ({ ctx }) => {
		return getPages(ctx);
	}),

	getPage: protectedProcedure.input(getPageInput).query(async ({ input, ctx }) => {
		return getPage(ctx, input);
	}),

	getPageInstance: protectedProcedure.input(getPageInstanceInput).query(async ({ input, ctx }) => {
		return getPageInstance(ctx, input);
	}),

	getPageInstances: protectedProcedure.input(getPageInstancesInput).query(async ({ input, ctx }) => {
		return getPageInstances(ctx, input);
	}),

	getPageInstanceTree: protectedProcedure.input(getPageInstanceTreeInput).query(async ({ input, ctx }) => {
		return getPageInstanceTree(ctx, input);
	}),

	getVisiblePageInstances: protectedProcedure.input(getVisiblePageInstancesInput).query(async ({ input, ctx }) => {
		return getVisiblePageInstances(ctx, input);
	}),

	createPage: protectedProcedure.input(createPageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createPage(ctx, input);
	}),

	createPageInstance: protectedProcedure.input(createPageInstanceInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return createPageInstance(ctx, input);
	}),

	updatePageTemplate: protectedProcedure.input(modifyPageInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return modifyPage(ctx, input);
	}),

	deletePageInstance: protectedProcedure.input(deletePageInstanceInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return deletePageInstance(ctx, input);
	}),
});
