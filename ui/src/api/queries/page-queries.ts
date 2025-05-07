import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Answer, Interval, PageInstance, PageTemplate, Question, QuestionStat } from '../../types';
import * as checklistActions from '../../state/checklist/actions';

export function usePageInstance(
	checklistId: number,
	pageId: number,
	callback: (data: PageInstance) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [checklistId, 'pages', pageId],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getPageInstance(checklistId, pageId);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: checklistId !== -1 && pageId !== -1 && enabled !== false,
	});
}

export function usePages(callback: (data: PageTemplate[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['pages', 'templates'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getPages();
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false,
	});
}

export function usePageInstanceTree(enabled: boolean, checklistId: number, claimId?: number) {
	return useQuery({
		queryKey: [checklistId, claimId, 'pages', 'instances'],
		queryFn: async () => {
			try {
				if (claimId) {
					const [tree, visiblePages] = await Promise.all([
						axiosRoutes.getPageInstanceTree(checklistId, claimId),
						axiosRoutes.getVisiblePageInstances(checklistId, claimId),
					]);
					if (tree.data && visiblePages.data) {
						checklistActions.updateTree(tree.data.tree, tree.data.maxPosition, visiblePages.data);
					}
					return tree;
				} else {
					const tree = await axiosRoutes.getPageInstanceTree(checklistId);
					if (tree.data) checklistActions.updateTree(tree.data.tree, tree.data.maxPosition);
					return tree;
				}
			} catch (e) {
				console.error(e);
			}
		},
		enabled: enabled !== false,
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
		enabled: !!pageId && enabled !== false,
	});
}

export function useQuestionStats(
	pageId: number | null,
	enabled: boolean,
	callback?: (pageId: number, data: QuestionStat[], from?: string, to?: string) => void,
	interval?: Interval<string>
) {
	const formattedInterval = interval && (interval.from || interval.to) ? interval : undefined;
	let queryKey: (string | number | null)[] = ['pages', pageId, 'questions', 'stats'];
	if (formattedInterval?.from) queryKey.push(formattedInterval.from);
	if (formattedInterval?.to) queryKey.push(formattedInterval.to);
	return useQuery({
		queryKey,
		queryFn: async ({ queryKey }) => {
			try {
				let pageId = +queryKey[1]!;
				let data = await axiosRoutes.getQuestionStats(pageId, formattedInterval);
				if (typeof callback === 'function' && data.data) {
					callback(pageId, data.data, queryKey[4]?.toString(), queryKey[5]?.toString());
				}
				return data.data as QuestionStat[];
			} catch (e) {
				console.error(e);
			}
		},
		enabled: !!pageId && enabled,
	});
}

export function useAddPage(checklistId: number) {
	return useMutation({
		mutationKey: [checklistId, 'pages', 'create'],
		mutationFn: async (variables: { title: string; parentId: number; position: number }) => {
			try {
				const { parentId, title, position } = variables;
				let data = await axiosRoutes.createPage(checklistId, { title, parentId, position });
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useCopyPage(checklistId: number, pageId: number) {
	return useMutation({
		mutationKey: [checklistId, 'pages', pageId, 'copy'],
		mutationFn: async (variables: { parentId: number; position: number }) => {
			try {
				const { parentId, position } = variables;
				let data = await axiosRoutes.createPageInstance(checklistId, pageId, { parentId, position });
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useDeletePage(instanceId: number) {
	return useMutation({
		mutationKey: ['pages', 'instances', instanceId, 'delete'],
		mutationFn: async () => {
			try {
				let data = await axiosRoutes.deletePageInstance(instanceId);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useModifyPage(pageId: number) {
	return useMutation({
		mutationKey: ['pages', pageId, 'update'],
		mutationFn: async (variables: { title: string }) => {
			try {
				let data = await axiosRoutes.modifyPage(pageId, variables);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useUpdatePage(pageId: number) {
	return useMutation({
		mutationKey: ['pages', pageId, 'update'],
		mutationFn: async (variables: { title: string }) => {
			try {
				const { title } = variables;
				let data = await axiosRoutes.modifyPage(pageId, { title });
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useAddUpdateQuestion(pageId: number) {
	return useMutation({
		mutationKey: ['pages', pageId, 'questions', 'update'],
		mutationFn: async (variables: { question: Omit<Question, 'answers'> }) => {
			try {
				const { question } = variables;
				let data =
					variables.question.id === -1
						? await axiosRoutes.createQuestion(pageId, question)
						: await axiosRoutes.modifyQuestion(pageId, question.id, question);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useAddUpdateAnswer(pageId: number, questionId: number) {
	return useMutation({
		mutationKey: [pageId, 'questions', questionId, 'answers', 'update'],
		mutationFn: async (variables: { answer: Answer }) => {
			try {
				const { answer } = variables;
				let data =
					variables.answer.id === -1
						? await axiosRoutes.createAnswer(pageId, questionId, answer)
						: await axiosRoutes.modifyAnswer(pageId, answer.id, answer);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useCopyQuestion(pageId: number, questionId: number) {
	return useMutation({
		mutationKey: ['pages', pageId, 'questions', questionId, 'copy'],
		mutationFn: async () => {
			try {
				let data = await axiosRoutes.copyQuestion(pageId, questionId);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useCopyAnswer(pageId: number, questionId: number, answerId: number) {
	return useMutation({
		mutationKey: [pageId, 'questions', questionId, 'answers', answerId, 'copy'],
		mutationFn: async () => {
			try {
				let data = await axiosRoutes.copyAnswer(pageId, questionId, answerId);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useDeleteQuestion(pageId: number, questionId: number) {
	return useMutation({
		mutationKey: [pageId, 'questions', questionId, 'delete'],
		mutationFn: async () => {
			try {
				await axiosRoutes.deleteQuestion(pageId, questionId);
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useDeleteAnswer(pageId: number, answerId: number) {
	return useMutation({
		mutationKey: [pageId, 'answers', answerId, 'delete'],
		mutationFn: async () => {
			try {
				await axiosRoutes.deleteAnswer(pageId, answerId);
			} catch (e) {
				console.error(e);
			}
		},
	});
}
