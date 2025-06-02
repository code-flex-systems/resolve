import { z } from 'zod';
import { t } from '../init';
import * as feedController from '@/api/controllers/feedController';
import { createFeedInput, updateFeedInput, deleteFeedInput } from '@/schemas/feedSchemas';

export const feedRouter = t.router({
	getFeeds: t.procedure.query(() => feedController.getFeeds()),

	getFeed: t.procedure.input(z.object({ id: z.number().int() })).query(({ input }) => feedController.getFeed(input)),

	createFeed: t.procedure.input(createFeedInput).mutation(({ input }) => feedController.createFeed(input)),

	updateFeed: t.procedure.input(updateFeedInput).mutation(({ input }) => feedController.updateFeed(input)),

	deleteFeed: t.procedure.input(deleteFeedInput).mutation(({ input }) => feedController.deleteFeed(input)),
});
