// apps/web/src/server/trpc/handler.ts
import { appRouter } from './appRouter';
import { createNextApiHandler } from '@trpc/server/adapters/next';

// For now, no auth context – add later if needed
export const handler = createNextApiHandler({
	router: appRouter,
	createContext: () => ({}),
});
