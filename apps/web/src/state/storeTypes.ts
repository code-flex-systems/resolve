import { ChecklistMode, SummarySegment } from '../config/enums';
import { Checklist, Claim, Interval, PageInstance, TreeNode, User } from '@/types/types';

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
