import { ChecklistMode, SummarySegment } from '@/config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	checklistSummaryContraints: {
		page: 0,
		pageSize: 50,
	},
	expandAll: false,
	mode: ChecklistMode.VIEW,
	selectedAnswer: null,
	selectedPageInstance: null,
	selectedPageInfo: null,
	selectedSummarySegment: SummarySegment.ANSWERED,
	selectedQuestion: null,
	// dialogs
	showActionDialog: false,
	showStatsDialog: false,
});

export default checklistSlice;
