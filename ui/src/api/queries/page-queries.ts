import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Answer, PageTemplate, Question, QuestionStat, TreeNode } from '../../types';
import { useChecklistSlice } from '../../state/store';
import { ChecklistMode } from '../../config/enums';
import * as checklistActions from '../../state/checklist/actions';

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
		enabled,
	});
}

export function usePageInstanceTreeForAdmin(
	checklistId: number,
	callback: (data: TreeNode[], maxPosition: number) => void,
	enabled?: boolean
) {
	return useQuery({
		queryKey: [checklistId, 'pages', 'instances'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getPageInstanceTree(checklistId);
				if (data.data) callback(data.data.tree, data.data.maxPosition);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
	});
}

export function usePageInstanceTreeForUser() {
	const checklistId = useChecklistSlice((state) => state.checklist)?.id ?? -1;
	const claimId = useChecklistSlice((state) => state.claim)?.id ?? -1;
	const mode = useChecklistSlice((state) => state.mode);
	const visibleInstanceIds = useChecklistSlice((state) => state.visibleInstanceIds);
	return useQuery({
		queryKey: [checklistId, claimId, 'pages', 'instances'],
		queryFn: async () => {
			try {
				if (mode === ChecklistMode.VIEW && !visibleInstanceIds.length) {
					const [tree, visiblePages] = await Promise.all([
						axiosRoutes.getPageInstanceTree(checklistId),
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

export function useQuestionStats(pageId: number | null, enabled: boolean) {
	return useQuery({
		queryKey: ['pages', pageId, 'questions', 'stats'],
		queryFn: async ({ queryKey }) => {
			try {
				let pageId = +queryKey[1]!;
				let data = await axiosRoutes.getQuestionStats(pageId);
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
						: await axiosRoutes.modifyQuestion(question.id, question);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useAddUpdateAnswer(questionId: number) {
	return useMutation({
		mutationKey: ['questions', questionId, 'answers', 'update'],
		mutationFn: async (variables: { answer: Answer }) => {
			try {
				const { answer } = variables;
				let data =
					variables.answer.id === -1
						? await axiosRoutes.createAnswer(questionId, answer)
						: await axiosRoutes.modifyAnswer(answer.id, answer);
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

export function useCopyAnswer(questionId: number, answerId: number) {
	return useMutation({
		mutationKey: ['questions', questionId, 'answers', answerId, 'copy'],
		mutationFn: async () => {
			try {
				let data = await axiosRoutes.copyAnswer(questionId, answerId);
				return data.data;
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useDeleteQuestion(questionId: number) {
	return useMutation({
		mutationKey: ['questions', questionId, 'delete'],
		mutationFn: async () => {
			try {
				await axiosRoutes.deleteQuestion(questionId);
			} catch (e) {
				console.error(e);
			}
		},
	});
}

export function useDeleteAnswer(answerId: number) {
	return useMutation({
		mutationKey: ['answers', answerId, 'delete'],
		mutationFn: async () => {
			try {
				await axiosRoutes.deleteAnswer(answerId);
			} catch (e) {
				console.error(e);
			}
		},
	});
}
