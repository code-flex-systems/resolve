import * as pageQueries from '@/api/queries/pageQueries';
import { TreeNode } from '@/types/types';

export async function createPage({ checklistId, params }: { checklistId: number; params: object }) {
	let results = await pageQueries.createPage(checklistId, params);
	return results;
}

export async function createPageInstance({
	checklistId,
	pageId,
	params,
}: {
	checklistId: number;
	pageId: number;
	params: object;
}) {
	let results = await pageQueries.createPageInstance(checklistId, pageId, params.parentId, params.position);
	return results;
}

export async function deletePageInstance({ instanceId }: { instanceId: number }) {
	await pageQueries.deletePageInstance(instanceId);
}

export async function getPage({ pageId }: { pageId: number }) {
	let results = await pageQueries.getPage(pageId);
	return results;
}

export async function getPages() {
	let results = await pageQueries.getPages();
	return results;
}

export async function getPageInstance({ instanceId }: { instanceId: number }) {
	let results = await pageQueries.getPageInstance(instanceId);
	return results;
}

export async function getPageInstances({ checklistId, parentId }: { checklistId: number; parentId: number }) {
	let results = await pageQueries.getPageInstances(checklistId, parentId);
	return results;
}

export async function getPageInstanceTree({ checklistId, claimId }: { checklistId: number; claimId?: number }) {
	let results =
		(claimId
			? await pageQueries.getPageInstancesForClaim(checklistId, claimId)
			: await pageQueries.getPageInstances(checklistId)) ?? [];
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

export async function getVisiblePageInstances({ checklistId, claimId }: { checklistId: number; claimId: number }) {
	let results = await pageQueries.getVisiblePageInstances(checklistId, claimId);
	return results;
}

export async function modifyPage({ id, params }: { id: number; params: object }) {
	let results = await pageQueries.modifyPage(id, params);
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
