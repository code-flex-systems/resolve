import * as feedController from '@/api/controllers/feedController';
import { createFeedInput, updateFeedInput, deleteFeedInput, getFeedOptions } from '@/schemas/feedSchemas';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';

export const feedRouter = router({
	getFeeds: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.getFeeds(ctx);
	}),

	getFeed: protectedProcedure.input(getFeedOptions).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.getFeed(ctx, input);
	}),

	createFeed: protectedProcedure.input(createFeedInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.createFeed(ctx, input);
	}),

	updateFeed: protectedProcedure.input(updateFeedInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.updateFeed(ctx, input);
	}),

	deleteFeed: protectedProcedure.input(deleteFeedInput).mutation(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.deleteFeed(ctx, input);
	}),
});
