import { TreeViewBaseItem } from '@mui/x-tree-view';
import { ChecklistMode } from '../../config/enums';
import { PageInstance, PageTemplate, Question, QuestionResponse, TreeNode } from '../../types';
import { SLICES } from '../storeConfig';
import { ChecklistSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);
const setState = setStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);

export function setClaimData(claim: any) {
	setState((state) => {
		state.claim = claim;
	});
}

export function updatePage(pageId: number, questions: Question[]) {
	setState((state) => {
		state.pages.set(pageId, questions);
	});
}

export function updatePageTemplates(newTemplates: PageTemplate[]) {
	setState((state) => {
		state.pageTemplates = newTemplates;
	});
}

export function toggleExpandAll() {
	setState((state) => {
		state.expandAll = !state.expandAll;
	});
}

export function updateInstanceResponses(instanceId: number, responses: Record<number, QuestionResponse>) {
	setState((state) => {
		state.responses.set(instanceId, responses);
	});
}

export function updateSelectedAnswer(questionId: number, answerId: number | null) {
	setState((state) => {
		state.selectedQuestion = questionId;
		state.selectedAnswer = answerId;
	});
}

export function updateSelectedPage(instanceId: number | null) {
	setState((state) => {
		state.selectedAnswer = null;
		state.selectedPageInstance = instanceId;
		state.selectedQuestion = null;
	});
}

export function updateSelectedPageInfo(pageInfo: TreeNode | null) {
	setState((state) => {
		state.selectedPageInfo = pageInfo;
	});
}

export function updateSelectedPageInfoSearch(instanceId: number) {
	const tree = getState().tree;
	let info = findTreeNode(instanceId, tree);
	if (info) {
		setState((state) => {
			state.selectedPageInfo = { ...info };
		});
	}
}

export function updateSelectedPageTitle(instanceId: number, newTitle: string) {
	setState((state) => {
		let node = findTreeNode(instanceId, state.tree);
		if (node) node.title = newTitle;
		if (state.selectedPageInfo) state.selectedPageInfo.title = newTitle;
	});
}

export function updateSelectedQuestion(questionId: number | null) {
	setState((state) => {
		state.selectedAnswer = null;
		state.selectedQuestion = questionId;
	});
}

export function updateTree(tree: TreeNode[], maxPosition: number) {
	setState((state) => {
		state.tree = tree;
		state.maxPageInstancePosition = maxPosition;
	});
}

export function updateMode(newMode: ChecklistMode) {
	setState((state) => {
		state.mode = newMode;
	});
}

function findTreeNode(instanceId: number, tree: TreeNode[]) {
	for (let p of tree) {
		let treeNode = findTreeNodePrivate(instanceId, p);
		if (treeNode) return treeNode;
	}
	return;
}

function findTreeNodePrivate(instanceId: number, treeNode: TreeNode) {
	if (treeNode.instanceId === instanceId) return treeNode;
	if (!treeNode.children) return;
	for (let c of treeNode.children) {
		return findTreeNodePrivate(instanceId, c);
	}
}
