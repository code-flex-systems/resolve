'use client';

import { createTRPCReact } from '@trpc/react-query';
import { httpBatchLink } from '@trpc/client';

import type { AppRouter } from '@/server/trpc/appRouter';

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
	transformer: undefined,
	links: [
		httpBatchLink({
			url: '/api/trpc/',
		}),
	],
});
