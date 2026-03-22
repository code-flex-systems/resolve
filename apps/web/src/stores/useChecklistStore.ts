import { DEFAULT_TREE_NODE } from '@/config/defaults';
import { ChecklistMode, PageInstanceStatus, SummarySegment } from '@/config/enums';
import { GetCommentOutput } from '@/hooks/trpc/useCommentTrpc';
import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { TreeNode } from '@/types/types';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';

// Enable Map and Set support for immer
enableMapSet();

interface ChecklistState {
	checklistSummaryContraints: {
		page: number;
		pageSize: number;
	};
	commentOffset: number;
	expandAll: boolean;
	expandedBranch: Set<string>;
	highlightedQuestion: string | null;
	mode: ChecklistMode;
	selectedAnswer: string | null;
	selectedAssignee: GetUserOutput | null;
	selectedPageInstance: string | null;
	selectedPageInfo: TreeNode | null;
	selectedSummarySegment: SummarySegment;
	selectedQuestion: string | null;
	// dialogs
	showActionDialog: boolean;
	showChecklistHandoffDialog: boolean;
	showChecklistProgressDialog: boolean;
	showStatsDialog: boolean;
	questionCommentDialog: {
		instanceId?: string;
		questionId?: string;
		existingComment?: GetCommentOutput;
		show: boolean;
	};
	updateSubmittedDialogAction: ((e?: React.BaseSyntheticEvent) => Promise<void>) | null;
	// ui
	showChangeLog: boolean;
	showComments: boolean;
}

interface ChecklistActions {
	clearExistingComment: () => void;
	clearExpandedBranch: () => void;
	goToPage: (instanceId: string, tree: TreeNode[]) => void;
	toggleExpandAll: () => void;
	toggleActionDialog: () => void;
	toggleChangeLog: () => void;
	toggleChecklistHandoffDialog: () => void;
	toggleChecklistProgressDialog: (v: boolean) => void;
	toggleComments: () => void;
	toggleHighlightedQuestion: (highlightedId: string) => void;
	toggleStatsDialog: () => void;
	toggleQuestionCommentDialog: (
		instanceId?: string,
		questionId?: string,
		existingComment?: GetCommentOutput
	) => void;
	toggleUpdateSubmittedDialog: (action?: (e?: React.BaseSyntheticEvent) => Promise<void>) => void;
	updateChecklistSummaryConstraints: (newConstraints: { page: number; pageSize: number }) => void;
	updateCommentOffset: (direction: number) => void;
	updateExpandedBranch: (id: string, reset?: boolean) => void;
	updateMode: (newMode: ChecklistMode) => void;
	updateSelectedAnswer: (questionId: string, answerId: string | null) => void;
	updateSelectedAssignee: (newUser: GetUserOutput | null) => void;
	updateSelectedPage: (instanceId: string | null) => void;
	updateSelectedPageInfo: (pageInfo: TreeNode | null) => void;
	updateSelectedPageInfoStatus: (newStatus: PageInstanceStatus) => void;
	updateSelectedPageInfoSearch: (instanceId: string, tree: TreeNode[]) => void;
	updateSelectedPageTitle: (instanceId: string, newTitle: string, tree: TreeNode[]) => void;
	updateSelectedSegment: (newSegment: SummarySegment) => void;
	updateSelectedQuestion: (questionId: string | null) => void;
	reset: (partialState?: Partial<ChecklistState>) => void;
}

type ChecklistStore = ChecklistState & ChecklistActions;

const initialState: ChecklistState = {
	checklistSummaryContraints: {
		page: 0,
		pageSize: 50,
	},
	commentOffset: 0,
	expandAll: true,
	expandedBranch: new Set<string>(),
	highlightedQuestion: null,
	mode: ChecklistMode.VIEW,
	selectedAnswer: null,
	selectedAssignee: null,
	selectedPageInstance: null,
	selectedPageInfo: null,
	selectedSummarySegment: SummarySegment.ANSWERED,
	selectedQuestion: null,
	// dialogs
	showActionDialog: false,
	showChecklistHandoffDialog: false,
	showChecklistProgressDialog: false,
	showStatsDialog: false,
	questionCommentDialog: {
		show: false,
	},
	updateSubmittedDialogAction: null,
	// ui
	showChangeLog: false,
	showComments: false,
};

// Helper functions
function findTreeNode(instanceId: string, tree: TreeNode[]): TreeNode | undefined {
	for (const p of tree) {
		const treeNode = findTreeNodePrivate(instanceId, p);
		if (treeNode) return treeNode;
	}
	return;
}

function findTreeNodePrivate(instanceId: string, treeNode: TreeNode): TreeNode | undefined {
	if (treeNode.instanceId === instanceId) return treeNode;
	if (!treeNode.children) return;
	for (const c of treeNode.children) {
		const found = findTreeNodePrivate(instanceId, c);
		if (found) return found;
	}
}

// Find all instances that share the same template (pageId) in the tree
function findInstancesWithSameTemplate(pageId: string, tree: TreeNode[]): TreeNode[] {
	const instances: TreeNode[] = [];

	function searchTree(node: TreeNode) {
		if (node.pageId === pageId) {
			instances.push(node);
		}
		if (node.children) {
			for (const child of node.children) {
				searchTree(child);
			}
		}
	}

	for (const rootNode of tree) {
		searchTree(rootNode);
	}

	return instances;
}

export const useChecklistStore = create<ChecklistStore>()(
	immer((set, get) => ({
		...initialState,

		clearExistingComment: () =>
			set((state) => {
				state.questionCommentDialog.existingComment = undefined;
			}),

		clearExpandedBranch: () =>
			set((state) => {
				state.expandedBranch.clear();
			}),

		goToPage: (instanceId, tree) => {
			get().updateExpandedBranch(instanceId, true);
			get().updateSelectedPage(instanceId);
			get().updateSelectedPageInfoSearch(instanceId, tree);
		},

		toggleExpandAll: () =>
			set((state) => {
				state.expandAll = !state.expandAll;
			}),

		toggleActionDialog: () =>
			set((state) => {
				state.showActionDialog = !state.showActionDialog;
			}),

		toggleChangeLog: () => {
			if (get().showComments) {
				set((state) => {
					state.showComments = false;
				});
				setTimeout(
					() =>
						set((state) => {
							state.showChangeLog = !state.showChangeLog;
						}),
					300
				);
			} else {
				set((state) => {
					state.showChangeLog = !state.showChangeLog;
				});
			}
		},

		toggleChecklistHandoffDialog: () =>
			set((state) => {
				state.showChecklistHandoffDialog = !state.showChecklistHandoffDialog;
			}),

		toggleChecklistProgressDialog: (v) =>
			set((state) => {
				state.showChecklistProgressDialog = v;
			}),

		toggleComments: () => {
			if (get().showChangeLog) {
				set((state) => {
					state.showChangeLog = false;
				});
				setTimeout(
					() =>
						set((state) => {
							state.showComments = !state.showComments;
						}),
					300
				);
			} else {
				set((state) => {
					state.showComments = !state.showComments;
				});
			}
		},

		toggleHighlightedQuestion: (highlightedId) =>
			set((state) => {
				state.highlightedQuestion = highlightedId;
			}),

		toggleStatsDialog: () =>
			set((state) => {
				state.showStatsDialog = !state.showStatsDialog;
			}),

		toggleQuestionCommentDialog: (instanceId, questionId, existingComment) =>
			set((state) => {
				state.questionCommentDialog = state.questionCommentDialog.show
					? { show: false }
					: { show: true, instanceId, questionId, existingComment };
			}),

		toggleUpdateSubmittedDialog: (action) =>
			set((state) => {
				state.updateSubmittedDialogAction = action ?? null;
			}),

		updateChecklistSummaryConstraints: (newConstraints) =>
			set((state) => {
				state.checklistSummaryContraints = newConstraints;
			}),

		updateCommentOffset: (direction) =>
			set((state) => {
				state.commentOffset = state.commentOffset + 30 * direction;
			}),

		updateExpandedBranch: (id, reset = false) =>
			set((state) => {
				if (reset) {
					state.expandedBranch = new Set([id]);
				} else {
					state.expandedBranch.add(id);
				}
			}),

		updateMode: (newMode) =>
			set((state) => {
				state.mode = newMode;
			}),

		updateSelectedAnswer: (questionId, answerId) =>
			set((state) => {
				state.selectedQuestion = questionId;
				state.selectedAnswer = answerId;
			}),

		updateSelectedAssignee: (newUser) =>
			set((state) => {
				state.selectedAssignee = newUser;
			}),

		updateSelectedPage: (instanceId) =>
			set((state) => {
				state.selectedAnswer = null;
				state.selectedPageInstance = instanceId;
				state.selectedQuestion = null;
				state.highlightedQuestion = null;
			}),

		updateSelectedPageInfo: (pageInfo) =>
			set((state) => {
				state.selectedPageInfo = pageInfo;
			}),

		updateSelectedPageInfoStatus: (newStatus) =>
			set((state) => {
				if (state.selectedPageInfo) {
					state.selectedPageInfo.status = newStatus;
				}
			}),

		updateSelectedPageInfoSearch: (instanceId, tree) => {
			const info = findTreeNode(instanceId, tree);
			if (info) {
				set((state) => {
					state.selectedPageInfo = { ...info };
				});
			}
		},

		updateSelectedPageTitle: (instanceId, newTitle, tree) =>
			set((state) => {
				const node = findTreeNode(instanceId, tree);
				if (node) node.title = newTitle;
				if (state.selectedPageInfo) state.selectedPageInfo.title = newTitle;
			}),

		updateSelectedSegment: (newSegment) =>
			set((state) => {
				state.selectedSummarySegment = newSegment;
				state.checklistSummaryContraints.page = 0;
			}),

		updateSelectedQuestion: (questionId) =>
			set((state) => {
				state.selectedAnswer = null;
				state.selectedQuestion = questionId;
			}),

		reset: (partialState) =>
			set((state) => {
				Object.assign(state, { ...initialState, ...partialState });
			}),
	}))
);

// Helper selector function
export const getSelectedPageInfoOrDefault = () => {
	return useChecklistStore.getState().selectedPageInfo ?? DEFAULT_TREE_NODE;
};

// Export utility function to find all instances with the same template
export const findInstancesByTemplateId = (pageId: string, tree: TreeNode[]): TreeNode[] => {
	return findInstancesWithSameTemplate(pageId, tree);
};
