import type { AppRouter } from '@/server/trpc/appRouter';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';

/**
 * Cached router type inference.
 *
 * Instead of running `inferRouterOutputs<AppRouter>` in every hook file,
 * we compute it once here. This significantly improves TypeScript performance.
 */
export type RouterOutput = inferRouterOutputs<AppRouter>;
export type RouterInput = inferRouterInputs<AppRouter>;
