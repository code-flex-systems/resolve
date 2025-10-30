import { trpc } from '@/lib/trpc';
import type { RouterInput, RouterOutput } from '@/types/routerTypes';

type DocInput = RouterInput['doc'];
type DocOutput = RouterOutput['doc'];

export function useDocTrpc() {
       return {
               list: trpc.doc.getDocs.useQuery,

               get: trpc.doc.getDoc.useQuery,

		create: trpc.doc.createDoc.useMutation,

		remove: trpc.doc.deleteDoc.useMutation,
	};
}

export type CreateDocInput = DocInput['createDoc'];
export type Doc = DocOutput['getDocs'][number];
