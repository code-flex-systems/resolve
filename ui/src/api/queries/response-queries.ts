import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { QuestionResponse } from '../../types';

export function useAllResponses(
	claimId: number,
	callback: (data: Record<number, QuestionResponse>) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [1, claimId, 'responses'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getAllResponses(1, claimId);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useResponses(
	claimId: number,
	instanceId: number,
	callback: (data: Record<number, QuestionResponse>) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [1, claimId, instanceId, 'responses'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getResponses(1, claimId, instanceId);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useUpsertResponses(instanceId: number) {
	return useMutation({
		mutationKey: ['responses', instanceId, 'update'],
		mutationFn: async (variables: { responses: QuestionResponse[] }) => {
			try {
				const { responses } = variables;
				await axiosRoutes.upsertResponses(responses);
			} catch (e) {
				console.error(e);
			}
		},
	});
}
