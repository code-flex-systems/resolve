import { ChecklistMode, PageInstanceStatus, SummarySegment } from '../../config/enums';
import {
	AnswerResponse,
	Checklist,
	ChecklistSummary,
	ChecklistSummaryCache,
	ChecklistSummaryRow,
	Claim,
	InstanceListItem,
	PageTemplate,
	Question,
	QuestionResponse,
	TreeNode,
} from '../../types';
import { SLICES } from '../storeConfig';
import { ChecklistSlice } from '../storeTypes';
import { getStateBuilder, setStateBuilder } from '../storeUtilities';

const getState = getStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);
const setState = setStateBuilder<ChecklistSlice>(SLICES.CHECKLIST);

export function getPageInstancesFromTree(currentInstanceId: number) {
	const tree = getState().tree;
	let instances: InstanceListItem[] = [];
	getInstances(tree, currentInstanceId, instances);
	return instances;
}

export function setChecklistData(newChecklist: Checklist) {
	setState((state) => {
		state.checklist = newChecklist;
	});
}

export function setChecklistSummaryTotals(newSummary: ChecklistSummary) {
	setState((state) => {
		state.checklistSummaryTotals = newSummary;
	});
}

export function setChecklistSummaryData({
	segment,
	limit,
	offset,
	rows,
	totalCount,
}: {
	segment: SummarySegment;
	limit: number;
	offset: number;
	rows: ChecklistSummaryRow[];
	totalCount: number;
}) {
	const { checklist, claim } = getState();
	if (!checklist || !claim) return;
	setState((state) => {
		state.checklistSummaryData.set(
			makeSegmentCacheKey({ checklistId: checklist.id, claimId: claim.id, segment, limit, offset }),
			{
				rows,
				totalCount,
				fetchedAt: new Date(),
			}
		);
	});
	pruneSegmentCache(5);
}

export function setClaimData(claim: Claim) {
	setState((state) => {
		state.claim = claim;
	});
}

export function toggleExpandAll() {
	setState((state) => {
		state.expandAll = !state.expandAll;
	});
}

export function toggleStatsDialog() {
	setState((state) => {
		if (state.showStatsDialog) state.answerResponses = new Map();
		state.showStatsDialog = !state.showStatsDialog;
	});
}

export function updateAnswerResponses(answerId: number, newResponses: AnswerResponse[]) {
	setState((state) => {
		state.answerResponses.set(answerId, newResponses);
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

export function updatePage(pageId: number, questions: Question[] | null) {
	setState((state) => {
		if (questions) {
			const newVersion = (state.pages.get(pageId)?.version ?? 0) + 1;
			state.pages.set(pageId, { version: newVersion, questions });
		} else {
			// Invalidate page cache to force a reload next time the user visits
			state.pages.delete(pageId);
		}
	});
}

export function updatePageTemplates(newTemplates: PageTemplate[]) {
	setState((state) => {
		state.pageTemplates = newTemplates;
	});
}

export function updateInstanceResponses(
	instanceId: number,
	version: number,
	responses: Record<number, QuestionResponse>
) {
	setState((state) => {
		state.responses.set(instanceId, { version, responses });
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

export function updateTree(tree: TreeNode[], maxPosition: number, visibleIds?: number[]) {
	setState((state) => {
		state.tree = tree;
		state.maxPageInstancePosition = maxPosition;
		if (visibleIds) state.visibleInstanceIds = visibleIds;
	});
}

export function updateTreeNodeStatus(instanceId: number, newStatus: PageInstanceStatus) {
	setState((state) => {
		const node = findTreeNode(instanceId, state.tree);
		if (node) node.status = newStatus;
		if (state.selectedPageInfo?.instanceId === instanceId) state.selectedPageInfo.status = newStatus;
	});
}

export function updateVisibleInstanceIds(newIds: number[]) {
	setState((state) => {
		state.visibleInstanceIds = newIds;
	});
}

// private methods

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

function getInstances(tree: TreeNode[], currentInstanceId: number, instances: InstanceListItem[]) {
	tree.forEach((node) => {
		if (node.instanceId !== currentInstanceId) {
			instances.push({ instanceId: node.instanceId, pageId: node.pageId });
		}

		if (node.children) {
			getInstances(node.children, currentInstanceId, instances);
		}
	});
}

export function makeSegmentCacheKey({
	claimId,
	checklistId,
	segment,
	limit,
	offset,
}: {
	claimId: number;
	checklistId: number;
	segment: SummarySegment;
	limit: number;
	offset: number;
}) {
	return `${claimId}-${checklistId}-${segment}-limit:${limit}-offset:${offset}`;
}

// private methods

function pruneSegmentCache(maxEntries: number) {
	setState((state) => {
		if (state.checklistSummaryData.size <= maxEntries) return;
		const sorted = [...state.checklistSummaryData.entries()].sort(
			(a, b) => a[1].fetchedAt.getTime() - b[1].fetchedAt.getTime()
		);
		const numToEvict = state.checklistSummaryData.size - maxEntries;
		for (let i = 0; i < numToEvict; i++) {
			state.checklistSummaryData.delete(sorted[i][0]);
		}
	});
}
