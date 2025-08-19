import { ChecklistMode, SummarySegment } from '@/config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	checklistSummaryContraints: {
		page: 0,
		pageSize: 50,
	},
	commentOffset: 0,
	expandAll: true,
	expandedBranch: new Set<number>(),
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
});

export default checklistSlice;
