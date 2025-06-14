import * as pageQueries from '@/api/queries/pageQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { TreeNode } from '@/types/types';

export async function createPage(
	ctx: ProtectedContext,
	{ checklistId, params }: { checklistId: number; params: object }
) {
	let results = await pageQueries.createPage(ctx, checklistId, params);
	return results;
}

export async function createPageInstance(
	ctx: ProtectedContext,
	{
		checklistId,
		pageId,
		params,
	}: {
		checklistId: number;
		pageId: number;
		params: object;
	}
) {
	let results = await pageQueries.createPageInstance(ctx, {
		checklistId,
		pageId,
		parentId: params.parentId,
		position: params.position,
	});
	return results;
}

export async function deletePageInstance(ctx: ProtectedContext, { instanceId }: { instanceId: number }) {
	await pageQueries.deletePageInstance(ctx, instanceId);
}

export async function getPage(ctx: ProtectedContext, { pageId }: { pageId: number }) {
	let results = await pageQueries.getPage(ctx, pageId);
	return results;
}

export async function getPages(ctx: ProtectedContext) {
	let results = await pageQueries.getPages(ctx);
	return results;
}

export async function getPageInstance(ctx: ProtectedContext, { instanceId }: { instanceId: number }) {
	let results = await pageQueries.getPageInstance(ctx, instanceId);
	return results;
}

export async function getPageInstances(
	ctx: ProtectedContext,
	{ checklistId, parentId }: { checklistId: number; parentId: number }
) {
	let results = await pageQueries.getPageInstances(ctx, checklistId, parentId);
	return results;
}

export async function getPageInstanceTree(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId?: number }
) {
	let results =
		(claimId
			? await pageQueries.getPageInstancesForClaim(ctx, checklistId, claimId)
			: await pageQueries.getPageInstances(ctx, checklistId)) ?? [];
	let tree: TreeNode[] = results
		.filter((row) => !row.parent_instance_id)
		.map((row) => ({
			instanceId: row.instance_id,
			parentInstanceId: row.parent_instance_id,
			pageId: row.id,
			position: row.position,
			title: row.title,
			status: row.status,
			template_version: row.template_version,
		}));
	for (let node of tree) {
		addChildrenToTree(node, results);
	}
	return { tree, maxPosition: results.length };
}

export async function getVisiblePageInstances(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	let results = await pageQueries.getVisiblePageInstances(ctx, checklistId, claimId);
	return results;
}

export async function modifyPage(ctx: ProtectedContext, { id, params }: { id: number; params: object }) {
	let results = await pageQueries.modifyPage(ctx, id, params);
	return results;
}

// private methods

function addChildrenToTree(node: TreeNode, results: Awaited<ReturnType<typeof pageQueries.getPageInstances>> = []) {
	let children: TreeNode[] = results
		.filter((row) => row.parent_instance_id === +node.instanceId)
		.map((row) => ({
			instanceId: row.instance_id,
			pageId: row.id,
			parentInstanceId: row.parent_instance_id,
			position: row.position,
			title: row.title,
			status: row.status,
			template_version: row.template_version,
		}));
	node.children = children.length ? children : undefined;
	if (node.children) {
		for (let c of node.children) {
			addChildrenToTree(c, results);
		}
	}
}
