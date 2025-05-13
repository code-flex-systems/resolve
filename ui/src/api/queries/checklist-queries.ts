import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Checklist, ChecklistClaim, ChecklistSummary } from '../../types';
import * as actions from '../../state/checklist/actions';
import { useChecklistSlice } from '../../state/store';
import { SummarySegment } from '../../config/enums';

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

export function useChecklistSummary(
	checklistId: number,
	claimId: number,
	callback: (newSummary: ChecklistSummary) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: ['checklists', checklistId, 'claims', claimId, 'summary'],
		queryFn: async ({ queryKey }) => {
			try {
				let data = await axiosRoutes.getChecklistSummary(+queryKey[1], +queryKey[3]);
				if (data.data) callback(data.data);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false && checklistId !== -1 && claimId !== -1,
	});
}

export function useChecklistSummaryDetail(enabled?: boolean) {
	const checklistId = useChecklistSlice((state) => state.checklist)?.id ?? -1;
	const claimId = useChecklistSlice((state) => state.claim)?.id ?? -1;
	const selectedSummarySegment = useChecklistSlice((state) => state.selectedSummarySegment);
	const { page, pageSize } = useChecklistSlice((state) => state.checklistSummaryContraints);
	return useQuery({
		queryKey: [
			'checklists',
			checklistId,
			'claims',
			claimId,
			'summary',
			selectedSummarySegment,
			page * pageSize,
			pageSize,
		],
		queryFn: async ({ queryKey }) => {
			try {
				const data = await axiosRoutes.getChecklistSummaryDetail(+queryKey[1], +queryKey[3], {
					segment: queryKey[5] as SummarySegment,
					offset: +queryKey[6],
					limit: +queryKey[7],
				});
				if (data.data) {
					actions.setChecklistSummaryData({
						rows: data.data.rows,
						totalCount: data.data.count,
						segment: queryKey[5] as SummarySegment,
						offset: +queryKey[6],
						limit: +queryKey[7],
					});
				}
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false && checklistId !== -1 && claimId !== -1 && !!selectedSummarySegment,
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
