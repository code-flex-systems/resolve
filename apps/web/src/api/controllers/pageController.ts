import * as pageQueries from '@/api/queries/pageQueries';
import { ProtectedContext } from '@/server/trpc/trpc';
import { TreeNode } from '@/types/types';
import type { PageInstanceParams, PageParams, PageUpdateParams } from '@/schemas/pageSchemas';

/**
 * Create a page template and attach an instance.
 *
 * @param ctx - request context
 * @param input - checklist id and page parameters
 * @returns ids for new page and instance
 */
export async function createPage(
        ctx: ProtectedContext,
        { checklistId, params }: { checklistId: number; params: PageParams }
) {
        const results = await pageQueries.createPage(ctx, checklistId, params);
        return results;
}

/**
 * Insert a page instance under a parent.
 *
 * @param ctx - request context
 * @param input - ids and positioning info
 */
export async function createPageInstance(
        ctx: ProtectedContext,
        {
                checklistId,
                pageId,
                params,
        }: {
                checklistId: number;
                pageId: number;
                params: PageInstanceParams;
        }
) {
        const results = await pageQueries.createPageInstance(ctx, {
                checklistId,
		pageId,
		parentId: params.parentId,
		position: params.position,
	});
	return results;
}

/**
 * Remove a page instance.
 *
 * @param ctx - request context
 * @param input - instance id
 */
export async function deletePageInstance(ctx: ProtectedContext, { instanceId }: { instanceId: number }) {
	await pageQueries.deletePageInstance(ctx, instanceId);
}

/**
 * Fetch a page template.
 *
 * @param ctx - request context
 * @param input - page id
 */
export async function getPage(ctx: ProtectedContext, { pageId }: { pageId: number }) {
	const results = await pageQueries.getPage(ctx, pageId);
	return results;
}

/**
 * List all visible page templates.
 *
 * @param ctx - request context
 */
export async function getPages(ctx: ProtectedContext) {
	const results = await pageQueries.getPages(ctx);
	return results;
}

/**
 * Load a page template with a specific instance.
 *
 * @param ctx - request context
 * @param input - instance id
 */
export async function getPageInstance(ctx: ProtectedContext, { instanceId }: { instanceId: number }) {
	const results = await pageQueries.getPageInstance(ctx, instanceId);
	return results;
}

/**
 * Retrieve child page instances.
 *
 * @param ctx - request context
 * @param input - checklist and parent ids
 */
export async function getPageInstances(
	ctx: ProtectedContext,
	{ checklistId, parentId }: { checklistId: number; parentId?: number }
) {
	const results = await pageQueries.getPageInstances(ctx, checklistId, parentId);
	return results;
}

/**
 * Build a tree of page instances optionally scoped to a claim.
 *
 * @param ctx - request context
 * @param input - checklist id and optional claim id
 * @returns a hierarchical tree with max position
 */
export async function getPageInstanceTree(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId?: number }
) {
	// Fetch all page instances for the checklist or claim
	const results =
		(claimId
			? await pageQueries.getPageInstancesForClaim(ctx, checklistId, claimId)
			: await pageQueries.getPageInstances(ctx, checklistId)) ?? [];
	const tree: TreeNode[] = results
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
	// Recursively attach child nodes to build the tree
	for (const node of tree) {
		addChildrenToTree(node, results);
	}
	return { tree, maxPosition: results.length };
}

/**
 * Determine visible instance ids for a claim.
 *
 * @param ctx - request context
 * @param input - checklist and claim ids
 */
export async function getVisiblePageInstances(
	ctx: ProtectedContext,
	{ checklistId, claimId }: { checklistId: number; claimId: number }
) {
	const results = await pageQueries.getVisiblePageInstances(ctx, checklistId, claimId);
	return results;
}

/**
 * Update a page template.
 *
 * @param ctx - request context
 * @param input - page id and update fields
 */
export async function modifyPage(
        ctx: ProtectedContext,
        { id, params }: { id: number; params: PageUpdateParams }
) {
        const results = await pageQueries.modifyPage(ctx, id, params);
        return results;
}

// private methods

/**
 * Recursively add children to a tree node.
 *
 * @param node - parent tree node
 * @param results - flat list of instances
 */
function addChildrenToTree(node: TreeNode, results: Awaited<ReturnType<typeof pageQueries.getPageInstances>> = []) {
	const children: TreeNode[] = results
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
		for (const c of node.children) {
			addChildrenToTree(c, results);
		}
	}
}
