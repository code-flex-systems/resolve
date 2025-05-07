import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { AnswerResponse, Interval, QuestionResponse } from '../../types';
import { PageInstanceStatus } from '../../config/enums';
import useStore, { useChecklistSlice } from '../../state/store';
import { useShallow } from 'zustand/react/shallow';
import * as actions from '../../state/checklist/actions';
import * as selectors from '../../state/checklist/selectors';

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

export function useResponses(enabled?: boolean) {
	const checklistId = useChecklistSlice((state) => state.checklist)?.id ?? -1;
	const claimId = useChecklistSlice((state) => state.claim)?.id ?? -1;
	const selectedPageInfo = useStore(useShallow(selectors.selectedPageInfo));
	const pageVersion = useChecklistSlice((state) => state.pages).get(selectedPageInfo.pageId)?.version ?? 1;
	return useQuery({
		queryKey: [checklistId, claimId, selectedPageInfo.instanceId, pageVersion, 'responses'],
		queryFn: async ({ queryKey }) => {
			try {
				if (selectedPageInfo.status === PageInstanceStatus.STALE) {
					const [responseData, evaluationData] = await Promise.all([
						axiosRoutes.getResponses(+queryKey[0], +queryKey[1], +queryKey[2]),
						axiosRoutes.evaluateResponses(+queryKey[0], +queryKey[1], +queryKey[2]),
					]);
					if (responseData && evaluationData) {
						actions.updateInstanceResponses(+queryKey[2], +queryKey[3], responseData.data);
						actions.updateTreeNodeStatus(+queryKey[2], evaluationData.data);
					}
					return responseData;
				} else {
					const data = await axiosRoutes.getResponses(+queryKey[0], +queryKey[1], +queryKey[2]);
					if (data.data) actions.updateInstanceResponses(+queryKey[2], +queryKey[3], data.data);
					return data;
				}
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false && claimId !== -1 && selectedPageInfo.instanceId !== -1,
	});
}

export function useResponsesForAnswer(
	answerId: number,
	callback: (answerId: number, data: AnswerResponse[], from?: string, to?: string) => void,
	enabled: boolean,
	interval?: Interval<string>
) {
	const formattedInterval = interval && (interval.from || interval.to) ? interval : undefined;
	let queryKey: (string | number | null)[] = [answerId, 'responses'];
	if (formattedInterval?.from) queryKey.push(formattedInterval.from);
	if (formattedInterval?.to) queryKey.push(formattedInterval.to);
	return useQuery({
		queryKey,
		queryFn: async ({ queryKey }) => {
			try {
				let data = await axiosRoutes.getResponsesForAnswer(+queryKey[0]!, formattedInterval);
				if (data.data) callback(+queryKey[0]!, data.data, queryKey[2]?.toString(), queryKey[3]?.toString());
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function useUpsertResponses(instanceId: number, version: number) {
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
				actions.updateInstanceResponses(instanceId, version, responseMap);
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
