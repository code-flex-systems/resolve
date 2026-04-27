import { QueryClient, dehydrate } from '@tanstack/react-query';

export function createServerQueryClient() {
	return new QueryClient({
		defaultOptions: {
			queries: {
				staleTime: 1000 * 60 * 5,
				refetchOnMount: true,
				refetchOnWindowFocus: false,
				refetchOnReconnect: false,
			},
		},
	});
}

export function dehydrateQueryClient(queryClient: QueryClient) {
	return dehydrate(queryClient);
}
