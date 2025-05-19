import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type DocInput = inferRouterInputs<AppRouter>['doc'];
type DocOutput = inferRouterOutputs<AppRouter>['doc'];

export function useDocTrpc() {
	const utils = trpc.useUtils();

	return {
		list: trpc.doc.getDocs.useQuery,

		get: trpc.doc.getDoc.useQuery,

		create: trpc.doc.createDoc.useMutation,

		remove: trpc.doc.deleteDoc.useMutation,
	};
}

export type CreateDocInput = DocInput['createDoc'];
export type Doc = DocOutput['getDocs'][number];
