import { appRouter } from '@/server/trpc/appRouter';
import { createContext } from '@/server/trpc/context';

export async function createServerCaller() {
	const context = await createContext();
	return appRouter.createCaller(context);
}
