import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Checklist, ChecklistClaim } from '../../types';

export function useAddChecklist(callback: (newChecklist: Checklist) => void) {
	return useMutation({
		mutationKey: ['checklists', 'create'],
		mutationFn: async (variables: { claimId: number; name: string }) => {
			try {
				const { claimId, name } = variables;
				let data = await axiosRoutes.createChecklist(claimId, { name });
				if (data.data) callback(data.data);
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useChecklist(id: number, callback: (newChecklist: Checklist) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['checklists', id],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getChecklist(id);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useChecklists(callback: (newChecklists: Checklist[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['checklists'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getChecklists();
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useChecklistClaim(checklistId: number, claimId: number) {
	return useQuery({
		queryKey: ['checklists', checklistId, 'claims', claimId],
		queryFn: async ({ queryKey }) => {
			try {
				let data = await axiosRoutes.getChecklistClaim(+queryKey[1], +queryKey[3]);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: checklistId !== -1 && claimId !== -1,
	});
}

export function useRecentChecklistClaims(callback: (newChecklists: ChecklistClaim[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['checklists', 'recents'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getRecentChecklistClaims();
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}
