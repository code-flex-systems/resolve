import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { AnswerResponse, QuestionResponse } from '../../types';
import * as actions from '../../state/checklist/actions';

export function useAllResponses(
	checklistId: number,
	claimId: number,
	callback: (data: Record<number, QuestionResponse>) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [checklistId, claimId, 'responses'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getAllResponses(checklistId, claimId);
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
	checklistId: number,
	claimId: number,
	instanceId: number,
	callback: (instanceId: number, data: Record<number, QuestionResponse>) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [checklistId, claimId, instanceId, 'responses'],
		queryFn: async ({ queryKey }) => {
			try {
				let data = await axiosRoutes.getResponses(checklistId, claimId, +queryKey[2]);
				if (data.data) callback(+queryKey[2], data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false && claimId !== -1 && instanceId !== -1,
	});
}

export function useResponsesForAnswer(
	answerId: number,
	callback: (answerId: number, data: AnswerResponse[]) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [answerId, 'responses'],
		queryFn: async ({ queryKey }) => {
			try {
				let data = await axiosRoutes.getResponsesForAnswer(+queryKey[0]);
				if (data.data) callback(+queryKey[0], data.data);
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
		mutationFn: async (variables: { instanceId: number; responses: QuestionResponse[] }) => {
			try {
				const { instanceId, responses } = variables;
				const data = await axiosRoutes.upsertResponses(responses);
				const responseMap: Record<number, QuestionResponse> = {};
				responses.forEach((r) => {
					responseMap[r.question_id] = r;
				});
				actions.updateInstanceResponses(instanceId, responseMap);
				if (data.data) {
					actions.updateTreeNodeStatus(instanceId, data.data.status);
					actions.updateVisibleInstanceIds(data.data.visibleIds);
				}
			} catch (e) {
				console.error(e);
			}
		},
	});
}
