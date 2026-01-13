import { createServerSideHelpers } from '@trpc/react-query/server';
import superjson from 'superjson';
import { appRouter } from '@/server/trpc/appRouter';
import { createContext } from '@/server/trpc/context';

export async function createServerHelpers() {
	const context = await createContext();
	return createServerSideHelpers({
		router: appRouter,
		ctx: context,
		transformer: superjson,
	});
}
