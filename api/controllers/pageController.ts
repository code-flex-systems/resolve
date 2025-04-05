import pageQueries from '../queries/pageQueries';

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

async function createPageInstance(checklistId: number, pageId: number, parentId: number) {
	try {
		let results = await pageQueries.createPageInstance(checklistId, pageId, parentId);
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

export interface TreeNode {
	id: number;
	title: string;
	children?: TreeNode[];
}

async function getPageInstanceTree(checklistId: number) {
	try {
		let results = (await pageQueries.getPageInstances(checklistId)) ?? [];
		let tree: TreeNode[] = results
			.filter((row) => !row.parent_id)
			.map((row) => ({ id: row.instance_id, title: row.title }));
		for (let node of tree) {
			addChildrenToTree(node, results);
		}
		return tree;
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
		parent_id: number | null;
	}[]
) {
	let children = results
		.filter((row) => row.parent_id === +node.id)
		.map((row) => ({ id: row.instance_id, title: row.title }));
	node.children = children.length ? children : undefined;
	if (node.children) {
		for (let c of node.children) {
			addChildrenToTree(c, results);
		}
	}
}
