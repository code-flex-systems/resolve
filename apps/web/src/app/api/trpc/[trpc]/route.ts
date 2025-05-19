// apps/web/app/api/trpc/[trpc]/route.ts
export const runtime = 'nodejs';

import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/trpc/appRouter';

// (optional) explicitly stay on the Edge runtime
// export const runtime = 'edge';

export const GET = (req: Request) =>
	fetchRequestHandler({
		endpoint: '/api/trpc', // the base path for your tRPC calls
		req, // the incoming Request
		router: appRouter, // your merged router
		createContext: () => ({}), // your context‐creation function
	});

// tRPC only needs GET and POST for its batching protocol
export const POST = GET;
