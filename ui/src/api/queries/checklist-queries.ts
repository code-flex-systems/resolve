import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Answer, Checklist, Question, TreeNode } from '../../types';

export function useChecklist(id: number, callback: (newChecklist: Checklist) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['checklists', id],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getChecklist(1);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}
