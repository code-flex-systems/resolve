import { ChecklistMode } from '../../config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	answerResponses: new Map(),
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
	selectedQuestion: null,
	tree: [],
	// dialogs
	showStatsDialog: false,
});

export default checklistSlice;
