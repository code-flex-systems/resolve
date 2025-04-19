import pageQueries from '../queries/pageQueries';
import { TreeNode } from '../types/types';

export default {
	createPage,
	createPageInstance,
	deletePageInstance,
	getPage,
	getPages,
	getPageInstance,
	getPageInstances,
	getPageInstanceTree,
	modifyPage,
};

async function createPage(checklistId: number, params: object) {
	try {
		let results = await pageQueries.createPage(checklistId, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function createPageInstance(checklistId: number, pageId: number, params: object) {
	try {
		let results = await pageQueries.createPageInstance(checklistId, pageId, params.parentId, params.position);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function deletePageInstance(instanceId: number) {
	try {
		await pageQueries.deletePageInstance(instanceId);
	} catch (e) {
		console.error(e);
	}
}

async function getPage(pageId: number) {
	try {
		let results = await pageQueries.getPage(pageId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getPages() {
	try {
		let results = await pageQueries.getPages();
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstance(instanceId: number) {
	try {
		let results = await pageQueries.getPageInstance(instanceId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstances(checklistId: number, parentId: number) {
	try {
		let results = await pageQueries.getPageInstances(checklistId, parentId);
		return results;
	} catch (e) {
		console.error(e);
	}
}

async function getPageInstanceTree(checklistId: number) {
	try {
		let results = (await pageQueries.getPageInstances(checklistId)) ?? [];
		let tree: TreeNode[] = results
			.filter((row) => !row.parent_instance_id)
			.map((row) => ({
				instanceId: row.instance_id,
				parentInstanceId: row.parent_instance_id,
				pageId: row.id,
				position: row.position,
				title: row.title,
			}));
		for (let node of tree) {
			addChildrenToTree(node, results);
		}
		return { tree, maxPosition: results.length };
	} catch (e) {
		console.error(e);
	}
}

async function modifyPage(id: number, params: object) {
	try {
		let results = await pageQueries.modifyPage(id, params);
		return results;
	} catch (e) {
		console.error(e);
	}
}

// private methods

function addChildrenToTree(
	node: TreeNode,
	results: {
		id: number;
		title: string;
		instance_id: number;
		position: number;
		parent_instance_id: number | null;
	}[]
) {
	let children: TreeNode[] = results
		.filter((row) => row.parent_instance_id === +node.instanceId)
		.map((row) => ({
			instanceId: row.instance_id,
			pageId: row.id,
			parentInstanceId: row.parent_instance_id,
			position: row.position,
			title: row.title,
		}));
	node.children = children.length ? children : undefined;
	if (node.children) {
		for (let c of node.children) {
			addChildrenToTree(c, results);
		}
	}
}
