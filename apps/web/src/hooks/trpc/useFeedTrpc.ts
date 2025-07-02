import { trpc } from '@/lib/trpc';

export function useFeedTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.feed.getFeeds.useQuery,

		count: trpc.feed.getFeedCount.useQuery,

		get: trpc.feed.getFeed.useQuery,

		create: trpc.feed.createFeed.useMutation({
			onSuccess() {
				utils.feed.getFeeds.invalidate();
			},
		}),

		update: trpc.feed.updateFeed.useMutation({
			onSuccess({ id }) {
				utils.feed.getFeeds.invalidate();
				utils.feed.getFeed.invalidate({ id });
			},
		}),

		remove: trpc.feed.deleteFeed.useMutation({
			onSuccess() {
				utils.feed.getFeeds.invalidate();
			},
		}),
	};
}
