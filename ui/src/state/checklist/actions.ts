import { TreeViewBaseItem } from '@mui/x-tree-view';
import { ChecklistMode } from '../../config/enums';
import { PageInstance, Question, TreeNode } from '../../types';
import { SLICES } from '../storeConfig';
import { ChecklistSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);
const setState = setStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);

export function updatePage(pageId: number, questions: Question[]) {
	setState((state) => {
		state.pages.set(pageId, questions);
	});
}

export function toggleExpanded(id: number) {
	setState((state) => {
		state.expanded.set(id, !state.expanded.get(id));
	});
}

export function toggleExpandAll() {
	setState((state) => {
		state.expandAll = !state.expandAll;
		if (!state.expandAll) state.expanded = new Map();
	});
}

export function updateSelectedAnswer(questionId: number, answerId: number | null) {
	setState((state) => {
		state.selectedQuestion = questionId;
		state.selectedAnswer = answerId;
	});
}

export function updateSelectedPage(pageId: number | null) {
	setState((state) => {
		state.selectedAnswer = null;
		state.selectedPage = pageId;
		state.selectedQuestion = null;
	});
}

export function updateSelectedQuestion(questionId: number | null) {
	setState((state) => {
		state.selectedAnswer = null;
		state.selectedQuestion = questionId;
	});
}

export function updateTree(tree: TreeNode[]) {
	setState((state) => {
		state.tree = tree;
	});
}

export function updatePages(children: PageInstance[]) {
	let formattedChildren: TreeViewBaseItem[] = children.map((c) => ({ id: c.instance_id.toString(), label: c.title }));
	setState((state) => {
		if (!state.selectedPage) {
			state.tree = formattedChildren;
		} else {
			let treeNode = findTreeNode(+state.selectedPage, state);
			if (treeNode) treeNode.children = formattedChildren;
		}
	});
}

export function updateMode(newMode: ChecklistMode) {
	setState((state) => {
		state.mode = newMode;
	});
}

function findTreeNode(instanceId: number, state: ChecklistSlice) {
	for (let p of state.tree) {
		let treeNode = findTreeNodePrivate(instanceId, p);
		if (treeNode) return treeNode;
	}
	return;
}

function findTreeNodePrivate(instanceId: number, treeNode: TreeViewBaseItem) {
	if (+treeNode.id === instanceId) return treeNode;
	if (!treeNode.children) return;
	for (let c of treeNode.children) {
		return findTreeNodePrivate(instanceId, c);
	}
}
