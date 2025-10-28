import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type PageInput = inferRouterInputs<AppRouter>['page'];
type PageOutput = inferRouterOutputs<AppRouter>['page'];

export function usePageTrpc() {
	const utils = trpc.useUtils();

	const onPageChange = () => {
		// Fire and forget invalidations in background (don't block the mutation callback)
		// Components that need fresh data will explicitly refetch (e.g., refetchTree())
		utils.page.getPages.invalidate();
		utils.page.getPageInstances.invalidate();
		utils.page.getVisiblePageInstances.invalidate();
		utils.page.getPageInstanceTree.invalidate();
		utils.answer.getAnswerCallGraph.invalidate();
	};

	return {
		listTemplates: trpc.page.getPages.useQuery,

		listInstances: trpc.page.getPageInstances.useQuery,

		listVisibleInstances: trpc.page.getVisiblePageInstances.useQuery,

		getTemplate: trpc.page.getPage.useQuery,

		getInstance: trpc.page.getPageInstance.useQuery,

		getInstanceTree: trpc.page.getPageInstanceTree.useQuery,

		createTemplate: trpc.page.createPage.useMutation({
			onSuccess: () => {
				onPageChange();
			},
		}),

		copyTemplate: trpc.page.copyPageTemplate.useMutation({
			onSuccess: () => {
				onPageChange();
			},
		}),

		createInstance: trpc.page.createPageInstance.useMutation({
			onSuccess: () => {
				onPageChange();
			},
		}),

		updateTemplate: trpc.page.updatePageTemplate.useMutation({
			onSuccess: () => {
				onPageChange();
			},
		}),

		removeInstance: trpc.page.deletePageInstance.useMutation({
			onSuccess: () => {
				onPageChange();
			},
		}),
	};
}

export type CreatePageTemplateInput = PageInput['createPage'];
export type CopyPageTemplateInput = PageInput['copyPageTemplate'];
export type CreatePageInstanceInput = PageInput['createPageInstance'];
export type UpdatePageTemplateInput = PageInput['updatePageTemplate'];
export type PageTemplate = PageOutput['getPages'][number];
export type PageInstance = PageOutput['getPageInstances'][number];
export type PageInstanceTree = PageOutput['getPageInstanceTree'];
export type TreeNode = PageOutput['getPageInstanceTree']['tree'];
