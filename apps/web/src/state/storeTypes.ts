import { ChecklistMode, SummarySegment } from '../config/enums';
import { Checklist, Claim, Interval, PageInstance, TreeNode, User } from '@/types/types';

export interface AdminSlice {
	claimConstraints: {
		page: number;
		pageSize: number;
	};
	selectedChecklistId: number | null;
	selectedFeedId: number | null | undefined;
	selectedTab: number;
	showImportClaimsDialog: boolean;
	showImportUsersDialog: boolean;
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
	expandAll: boolean;
	mode: ChecklistMode;
	selectedAnswer: number | null;
	selectedPageInstance: number | null;
	selectedPageInfo: TreeNode | null;
	selectedSummarySegment: SummarySegment;
	selectedQuestion: number | null;
	// dialogs
	showActionDialog: boolean;
	showChecklistProgressDialog: boolean;
	showStatsDialog: boolean;
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
