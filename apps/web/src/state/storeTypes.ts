import { GetUserOutput } from '@/hooks/trpc/useUserTrpc';
import { ChecklistMode, ClaimStatus, SummarySegment } from '../config/enums';
import { Checklist, Claim, Interval, PageInstance, TreeNode, User } from '@/types/types';
import { GetCommentOutput } from '@/hooks/trpc/useCommentTrpc';

export interface AdminSlice {
	claimConstraints: {
		page: number;
		pageSize: number;
	};
	selectedChecklistId: number | null;
	selectedFeedId: number | null | undefined;
	selectedTab: number;
	showClaimAssignmentDialog: boolean;
	showImportClaimsDialog: boolean;
	showImportUsersDialog: boolean;
	showInactiveUsers: boolean;
	showNewChecklistDialog: boolean;
	showNewClaimDialog: boolean;
	showNewUserDialog: boolean;
	userConstraints: {
		page: number;
		pageSize: number;
	};
	userSearchTerm: string;
}

export interface BreakdownSlice {
	breakdownInterval: Interval<string>;
	pageInstance: PageInstance | null;
	selectedAnswerId: number | null;
	selectedQuestionId: number | null;
}

export interface ChecklistSlice {
	checklistSummaryContraints: {
		page: number;
		pageSize: number;
	};
	commentOffset: number;
	expandAll: boolean;
	expandedBranch: Set<number>;
	highlightedQuestion: number | null;
	mode: ChecklistMode;
	selectedAnswer: number | null;
	selectedAssignee: GetUserOutput | null;
	selectedPageInstance: number | null;
	selectedPageInfo: TreeNode | null;
	selectedSummarySegment: SummarySegment;
	selectedQuestion: number | null;
	// dialogs
	showActionDialog: boolean;
	showChecklistHandoffDialog: boolean;
	showChecklistProgressDialog: boolean;
	showStatsDialog: boolean;
	questionCommentDialog: {
		instanceId?: number;
		questionId?: number;
		existingComment?: GetCommentOutput;
		show: boolean;
	};
	updateSubmittedDialogAction: ((e?: React.BaseSyntheticEvent) => Promise<void>) | null;
	// ui
	showChangeLog: boolean;
	showComments: boolean;
}

export interface ChecklistsSlice {
	selectedChecklist: Checklist | null;
	selectedClaim: Claim | null;
	// dialogs
	showChecklistClaimDialog: boolean;
}

export interface GlobalSlice {
	navOpen: boolean;
	selectedPage: string;
	user: User;
}

export interface MetricsSlice {
	selectedClaimStatus: ClaimStatus | null;
}
