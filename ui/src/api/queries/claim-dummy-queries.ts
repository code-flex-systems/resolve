import { useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';

export function useClaimDummy(callback: (data: any) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['claims', 1],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getClaim(1, 1);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}
