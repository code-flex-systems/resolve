import { appRouter } from './appRouter';
import { createContext } from './context';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

export const handler = (req: Request) =>
	fetchRequestHandler({
		endpoint: '/api/trpc',
		req,
		router: appRouter,
		createContext,
	});
