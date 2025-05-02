import { useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Claim } from '../../types';

export function useClaim(checklistId: number, claimId: number, callback: (data: Claim) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['checklists', checklistId, 'claims', claimId],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getClaim(checklistId, claimId);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useClaims(callback?: (data: Claim[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['claims'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getClaims();
				if (data.data && typeof callback === 'function') callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}
