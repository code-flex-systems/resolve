import { trpc } from '@/lib/trpc';
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from '@/server/trpc/appRouter';

type PageInput = inferRouterInputs<AppRouter>['page'];
type PageOutput = inferRouterOutputs<AppRouter>['page'];

export function usePageTrpc() {
	const utils = trpc.useUtils();

	return {
		listTemplates: trpc.page.getPages.useQuery,

		listInstances: trpc.page.getPageInstances.useQuery,

		listVisibleInstances: trpc.page.getVisiblePageInstances.useQuery,

		getTemplate: trpc.page.getPage.useQuery,

		getInstance: trpc.page.getPageInstance.useQuery,

		getInstanceTree: trpc.page.getPageInstanceTree.useQuery,

		createTemplate: trpc.page.createPage.useMutation,

		createInstance: trpc.page.createPageInstance.useMutation,

		updateTemplate: trpc.page.updatePageTemplate.useMutation,

		removeInstance: trpc.page.deletePageInstance.useMutation,
	};
}

export type CreatePageTemplateInput = PageInput['createPage'];
export type CreatePageInstanceInput = PageInput['createPageInstance'];
export type UpdatePageTemplateInput = PageInput['updatePageTemplate'];
export type PageTemplate = PageOutput['getPages'][number];
export type PageInstance = PageOutput['getPageInstances'][number];
export type PageInstanceTree = PageOutput['getPageInstanceTree'];
export type TreeNode = PageOutput['getPageInstanceTree']['tree'];
