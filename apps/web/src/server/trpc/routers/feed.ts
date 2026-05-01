import * as feedController from '@/api/controllers/feedController';
import {
	createFeedInput,
	updateFeedInput,
	deleteFeedInput,
	getFeedOptions,
	getFeedCountInput,
} from '@/schemas/feedSchemas';
import { requireRole } from '@/lib/auth/requireRole';
import config from '@/config/config';
import { protectedProcedure, router } from '../trpc';

export const feedRouter = router({
	getFeeds: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.getFeeds(ctx);
	}),

	getFeedCount: protectedProcedure.input(getFeedCountInput).query(async ({ input, ctx }) => {
		if (input.clientId) {
			// Client aliasing requires Super Admin role
			requireRole(ctx, config.ROLES.SUPER_ADMIN);
		} else {
			requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		}
		return feedController.getFeedCount(ctx, {
			clientId: input.clientId ?? ctx.session.user.client_id!,
		});
	}),

	getFeed: protectedProcedure.input(getFeedOptions).query(async ({ input, ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.getFeed(ctx, input);
	}),

	getLastSyncedFeed: protectedProcedure.query(async ({ ctx }) => {
		requireRole(ctx, [config.ROLES.ADMIN, config.ROLES.SUPER_ADMIN]);
		return feedController.getLastSyncedFeed(ctx);
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
