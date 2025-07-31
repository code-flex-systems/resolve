import { ChecklistMode, SummarySegment } from '@/config/enums';
import { TreeNode } from '@/types/types';
import { SLICES } from '../storeConfig';
import { ChecklistSlice } from '../storeTypes';
import { setStateBuilder } from '../storeUtilities';
import { PageInstanceStatus } from '@/config/enums';

const setState = setStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);

export function toggleExpandAll() {
	setState((state) => {
		state.expandAll = !state.expandAll;
	});
}

export function toggleActionDialog() {
	setState((state) => {
		state.showActionDialog = !state.showActionDialog;
	});
}

export function toggleChecklistProgressDialog() {
	setState((state) => {
		state.showChecklistProgressDialog = !state.showChecklistProgressDialog;
	});
}

export function toggleStatsDialog() {
	setState((state) => {
		state.showStatsDialog = !state.showStatsDialog;
	});
}

export function updateChecklistSummaryConstraints(newConstraints: { page: number; pageSize: number }) {
	setState((state) => {
		state.checklistSummaryContraints = newConstraints;
	});
}

export function updateMode(newMode: ChecklistMode) {
	setState((state) => {
		state.mode = newMode;
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

export function updateSelectedPageInfoStatus(newStatus: PageInstanceStatus) {
	setState((state) => {
		if (state.selectedPageInfo) {
			state.selectedPageInfo.status = newStatus;
		}
	});
}

export function updateSelectedPageInfoSearch(instanceId: number, tree: TreeNode[]) {
	const info = findTreeNode(instanceId, tree);
	if (info) {
		setState((state) => {
			state.selectedPageInfo = { ...info };
		});
	}
}

export function updateSelectedPageTitle(instanceId: number, newTitle: string, tree: TreeNode[]) {
	setState((state) => {
		const node = findTreeNode(instanceId, tree);
		if (node) node.title = newTitle;
		if (state.selectedPageInfo) state.selectedPageInfo.title = newTitle;
	});
}

export function updateSelectedSegment(newSegment: SummarySegment) {
	setState((state) => {
		state.selectedSummarySegment = newSegment;
		state.checklistSummaryContraints.page = 0;
	});
}

export function updateSelectedQuestion(questionId: number | null) {
	setState((state) => {
		state.selectedAnswer = null;
		state.selectedQuestion = questionId;
	});
}

// private methods

function findTreeNode(instanceId: number, tree: TreeNode[]) {
	for (const p of tree) {
		const treeNode = findTreeNodePrivate(instanceId, p);
		if (treeNode) return treeNode;
	}
	return;
}

function findTreeNodePrivate(instanceId: number, treeNode: TreeNode) {
	if (treeNode.instanceId === instanceId) return treeNode;
	if (!treeNode.children) return;
	for (const c of treeNode.children) {
		return findTreeNodePrivate(instanceId, c);
	}
}
