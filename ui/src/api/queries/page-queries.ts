import { useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { PageInstance, Question, TreeNode } from '../../types';

export function usePageInstanceTree(callback: (data: TreeNode[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['pages', 'instances'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getPageInstanceTree(1);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useQuestions(
	pageId: number | null,
	enabled: boolean,
	callback: (pageId: number, data: Question[]) => void
) {
	return useQuery({
		queryKey: ['pages', pageId, 'questions'],
		queryFn: async ({ queryKey }) => {
			try {
				let pageId = +queryKey[1]!;
				let data = await axiosRoutes.getQuestions(pageId);
				if (data.data) callback(pageId, data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: !!pageId && enabled,
	});
}
