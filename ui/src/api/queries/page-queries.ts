import { useMutation, useQuery } from '@tanstack/react-query';
import * as axiosRoutes from '../axios-routes';
import { Answer, Question, TreeNode } from '../../types';
import * as actions from '../../state/checklist/actions';

export function usePageInstanceTree(callback: (data: TreeNode[]) => void, enabled?: boolean) {
	return useQuery({
		queryKey: ['pages', 'instances'],
		queryFn: async () => {
			try {
				let data = await axiosRoutes.getPageInstanceTree(1);
				if (data.data) callback(data.data);
				return data;
			} catch (e) {
				console.error(e);
			}
		},
		enabled,
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
