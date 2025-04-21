import { ChecklistMode } from '../../config/enums';
import { ChecklistSlice } from '../storeTypes';

const checklistSlice: ChecklistSlice = Object.freeze({
	claim: null,
	expanded: new Map(),
	expandAll: false,
	maxPageInstancePosition: 0,
	mode: ChecklistMode.VIEW,
	pages: new Map(),
	responses: new Map(),
	selectedAnswer: null,
	selectedPageInstance: null,
	selectedPageInfo: null,
	selectedQuestion: null,
	tree: [],
});

export default checklistSlice;
