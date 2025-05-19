import { ChecklistMode, SummarySegment } from '@/config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	answerResponses: new Map(),
	checklist: null,
	checklistSummaryTotals: null,
	checklistSummaryContraints: {
		page: 0,
		pageSize: 50,
	},
	checklistSummaryData: new Map(),
	claim: null,
	expandAll: false,
	maxPageInstancePosition: 0,
	mode: ChecklistMode.VIEW,
	pages: new Map(),
	pageTemplates: [],
	responses: new Map(),
	selectedAnswer: null,
	selectedPageInstance: null,
	selectedPageInfo: null,
	selectedSummarySegment: SummarySegment.ANSWERED,
	selectedQuestion: null,
	tree: [],
	visibleInstanceIds: [],
	// dialogs
	showStatsDialog: false,
});

export default checklistSlice;
